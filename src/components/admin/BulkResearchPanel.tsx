"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Play,
  Square,
  Loader2,
  DollarSign,
  Calculator,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BulkResearchJobSummary, BulkResearchJobStatus } from "@/lib/types";

type ParkOption = {
  id: string;
  name: string;
};

const STATUS_STYLES: Record<BulkResearchJobStatus, string> = {
  QUEUED: "bg-gray-100 text-gray-800 border-gray-200",
  RUNNING: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  ABORTED: "bg-orange-100 text-orange-800 border-orange-200",
};

function StatusBadge({ status }: { status: BulkResearchJobStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[status] || "bg-gray-100 text-gray-800 border-gray-200"}`}
    >
      {status}
    </span>
  );
}

export function BulkResearchPanel() {
  // Park selection
  const [parks, setParks] = useState<ParkOption[]>([]);
  const [selectedParkIds, setSelectedParkIds] = useState<string[]>([]);
  const [parkSearch, setParkSearch] = useState("");
  const [loadingParks, setLoadingParks] = useState(true);

  // Launch form
  const [maxParks, setMaxParks] = useState(50);
  const [maxCostUSD, setMaxCostUSD] = useState(5.0);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{
    estimatedCostUSD: number;
    parkCount: number;
    sourceCount: number;
  } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Active job tracking
  const [activeJob, setActiveJob] = useState<BulkResearchJobSummary | null>(
    null
  );
  const [aborting, setAborting] = useState(false);

  // Job history
  const [jobHistory, setJobHistory] = useState<BulkResearchJobSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch parks list
  useEffect(() => {
    async function fetchParks() {
      try {
        const res = await fetch("/api/admin/parks/list");
        if (res.ok) {
          const data = await res.json();
          setParks(
            data.parks.map((p: { id: string; name: string }) => ({
              id: p.id,
              name: p.name,
            }))
          );
        }
      } catch {
        // silently fail
      } finally {
        setLoadingParks(false);
      }
    }
    fetchParks();
  }, []);

  // Fetch job list and find active job
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-research/bulk-research");
      if (res.ok) {
        const data = await res.json();
        const jobs: BulkResearchJobSummary[] = data.jobs;
        setJobHistory(jobs);

        // Find active job (QUEUED or RUNNING)
        const running = jobs.find(
          (j) => j.status === "QUEUED" || j.status === "RUNNING"
        );
        if (running) {
          setActiveJob(running);
        } else {
          setActiveJob(null);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Poll active job every 3 seconds
  useEffect(() => {
    if (!activeJob) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/admin/ai-research/bulk-research?jobId=${activeJob.id}`
        );
        if (res.ok) {
          const data = await res.json();
          const job: BulkResearchJobSummary = data.job;
          setActiveJob(
            job.status === "QUEUED" || job.status === "RUNNING" ? job : null
          );
          // Refresh history
          fetchJobs();
        }
      } catch {
        // silently fail
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeJob, fetchJobs]);

  // Handlers
  async function handleEstimate() {
    if (selectedParkIds.length === 0) return;
    setEstimating(true);
    setEstimate(null);
    try {
      const res = await fetch(
        `/api/admin/ai-research/bulk-research?action=estimate&parkIds=${selectedParkIds.join(",")}`
      );
      if (res.ok) {
        const data = await res.json();
        setEstimate(data);
      }
    } catch {
      // silently fail
    } finally {
      setEstimating(false);
    }
  }

  async function handleLaunch() {
    if (selectedParkIds.length === 0) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await fetch("/api/admin/ai-research/bulk-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parkIds: selectedParkIds,
          maxParks,
          maxCostUSD,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Reset form
        setSelectedParkIds([]);
        setEstimate(null);
        // Start polling the new job
        setActiveJob({
          id: data.jobId,
          status: "QUEUED",
          totalParks: selectedParkIds.length,
          completedParks: 0,
          failedParks: 0,
          currentParkId: null,
          currentParkName: null,
          maxParks,
          maxCostUSD,
          spentCostUSD: 0,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
        });
        fetchJobs();
      } else {
        const data = await res.json();
        setLaunchError(data.error || "Failed to launch");
      }
    } catch {
      setLaunchError("Network error");
    } finally {
      setLaunching(false);
    }
  }

  async function handleAbort() {
    if (!activeJob) return;
    setAborting(true);
    try {
      await fetch(
        `/api/admin/ai-research/bulk-research/${activeJob.id}/abort`,
        { method: "POST" }
      );
      fetchJobs();
    } catch {
      // silently fail
    } finally {
      setAborting(false);
    }
  }

  function togglePark(parkId: string) {
    setSelectedParkIds((prev) =>
      prev.includes(parkId)
        ? prev.filter((id) => id !== parkId)
        : [...prev, parkId]
    );
    setEstimate(null);
  }

  function selectAll() {
    const filtered = filteredParks.map((p) => p.id);
    setSelectedParkIds((prev) => {
      const combined = new Set([...prev, ...filtered]);
      return Array.from(combined);
    });
    setEstimate(null);
  }

  function clearSelection() {
    setSelectedParkIds([]);
    setEstimate(null);
  }

  const filteredParks = parks.filter((p) =>
    p.name.toLowerCase().includes(parkSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Active Job Tracker */}
      {activeJob && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <h3 className="text-lg font-semibold text-blue-900">
                Bulk Research In Progress
              </h3>
              <StatusBadge status={activeJob.status} />
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleAbort}
              disabled={aborting}
            >
              {aborting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Abort
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm text-blue-700 mb-1">
              <span>
                {activeJob.completedParks + activeJob.failedParks} /{" "}
                {activeJob.totalParks} parks processed
              </span>
              <span>
                {activeJob.totalParks > 0
                  ? Math.round(
                      ((activeJob.completedParks + activeJob.failedParks) /
                        activeJob.totalParks) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${activeJob.totalParks > 0 ? ((activeJob.completedParks + activeJob.failedParks) / activeJob.totalParks) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <span className="text-blue-600">Current Park</span>
              <p className="font-medium text-blue-900 truncate">
                {activeJob.currentParkName || "Waiting..."}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Completed
              </span>
              <p className="font-medium text-gray-900">
                {activeJob.completedParks}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Failed
              </span>
              <p className="font-medium text-gray-900">
                {activeJob.failedParks}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <span className="text-gray-600 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Cost
              </span>
              <p className="font-medium text-gray-900">
                ${activeJob.spentCostUSD.toFixed(2)} / $
                {activeJob.maxCostUSD.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Launch Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Launch Bulk Research
        </h3>

        {/* Park Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Parks ({selectedParkIds.length} selected)
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Search parks..."
              value={parkSearch}
              onChange={(e) => setParkSearch(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button variant="outline" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
          <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
            {loadingParks ? (
              <div className="p-4 text-center text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Loading parks...
              </div>
            ) : filteredParks.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No parks found
              </div>
            ) : (
              filteredParks.map((park) => (
                <label
                  key={park.id}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedParkIds.includes(park.id)}
                    onChange={() => togglePark(park.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{park.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Budget Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Parks
            </label>
            <input
              type="number"
              min={1}
              value={maxParks}
              onChange={(e) =>
                setMaxParks(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Cost (USD)
            </label>
            <input
              type="number"
              min={0.01}
              step={0.5}
              value={maxCostUSD}
              onChange={(e) =>
                setMaxCostUSD(
                  Math.max(0.01, parseFloat(e.target.value) || 0.01)
                )
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Estimate */}
        {estimate && (
          <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm">
            <div className="flex items-center gap-2 text-gray-700 mb-1">
              <Calculator className="w-4 h-4" />
              <span className="font-medium">Cost Estimate</span>
            </div>
            <p>
              {estimate.parkCount} parks, {estimate.sourceCount} sources
            </p>
            <p className="font-semibold text-gray-900">
              ~${estimate.estimatedCostUSD.toFixed(2)} USD
            </p>
          </div>
        )}

        {launchError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {launchError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleEstimate}
            disabled={selectedParkIds.length === 0 || estimating}
          >
            {estimating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            Estimate Cost
          </Button>
          <Button
            onClick={handleLaunch}
            disabled={
              selectedParkIds.length === 0 || launching || !!activeJob
            }
          >
            {launching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Launch
          </Button>
          {activeJob && (
            <p className="text-sm text-gray-500 self-center">
              A job is already running. Wait for it to finish or abort it first.
            </p>
          )}
        </div>
      </div>

      {/* Job History */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Job History
        </h3>
        {loadingHistory ? (
          <div className="text-center text-gray-500 py-4">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            Loading...
          </div>
        ) : jobHistory.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No bulk research jobs yet. Select parks above and launch your first
            batch.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Parks
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Failed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobHistory.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {job.totalParks}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-700">
                      {job.completedParks}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-700">
                      {job.failedParks}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${job.spentCostUSD.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
