"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink, Play, Loader2, ShieldCheck, ShieldOff, SkipForward, RotateCcw, Ban, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataSourceSummary } from "@/lib/types";

type Props = {
  sources: DataSourceSummary[];
  parkId: string;
};

export function SourceManagementTable({ sources, parkId }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isOfficial, setIsOfficial] = useState(false);
  const [adding, setAdding] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<string | null>(null);
  const [processingSourceId, setProcessingSourceId] = useState<string | null>(null);

  const handleResearch = async () => {
    setResearching(true);
    setResearchResult(null);
    try {
      const response = await fetch(
        `/api/admin/ai-research/parks/${parkId}/research`,
        { method: "POST" }
      );
      const data = await response.json();
      if (response.ok) {
        setResearchResult(`Research complete. Session: ${data.sessionId}`);
        router.refresh();
      } else {
        setResearchResult(`Error: ${data.error || "Research failed"}`);
      }
    } catch (err) {
      setResearchResult(`Error: ${err instanceof Error ? err.message : "Network error"}`);
    } finally {
      setResearching(false);
    }
  };

  const handleSourceAction = async (sourceId: string, action: string) => {
    setProcessingSourceId(sourceId);
    try {
      const response = await fetch("/api/admin/ai-research/sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, action }),
      });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Action failed");
      }
    } finally {
      setProcessingSourceId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setAdding(true);
    try {
      const response = await fetch("/api/admin/ai-research/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkId, url: url.trim(), isOfficial }),
      });
      if (response.ok) {
        setUrl("");
        setIsOfficial(false);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to add source");
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Trigger Research */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">AI Research</p>
          <p className="text-xs text-gray-500">
            Crawl all sources, discover new ones via web search, and extract park data using AI.
          </p>
        </div>
        <Button
          onClick={handleResearch}
          disabled={researching}
          size="sm"
        >
          {researching ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-1" />
              Run Research
            </>
          )}
        </Button>
      </div>
      {researchResult && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            researchResult.startsWith("Error")
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-green-50 border-green-200 text-green-800"
          }`}
        >
          {researchResult}
        </div>
      )}

      {/* Add Source Form */}
      <form onSubmit={handleAdd} className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/park-info"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
            <input
              type="checkbox"
              checked={isOfficial}
              onChange={(e) => setIsOfficial(e.target.checked)}
              className="rounded border-gray-300"
            />
            Official
          </label>
          <Button type="submit" size="sm" disabled={adding}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </form>

      {/* Sources Table */}
      {sources.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500 text-sm">No sources yet. Add a URL above or trigger AI research.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Crawled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reliability</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sources.map((source) => (
                <tr key={source.id} className={`hover:bg-gray-50 ${source.crawlStatus === "SKIPPED" || source.crawlStatus === "WRONG_PARK" ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 max-w-xs truncate"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {source.title || source.url}
                    </a>
                    {source.isOfficial && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Official
                      </span>
                    )}
                    {source.approveCount + source.rejectCount > 0 &&
                      source.approveCount / (source.approveCount + source.rejectCount) < 0.2 && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Low Accuracy
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{source.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatOrigin(source.origin)}
                  </td>
                  <td className="px-4 py-3">
                    <CrawlStatusBadge status={source.crawlStatus} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {source.lastCrawledAt
                      ? new Date(source.lastCrawledAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${
                      source.reliability >= 70 ? "text-green-700" :
                      source.reliability >= 40 ? "text-yellow-700" :
                      "text-red-700"
                    }`}>
                      {source.reliability}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {source.crawlStatus === "WRONG_PARK" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleSourceAction(source.id, "unskip")}
                          disabled={processingSourceId !== null}
                          title="Restore — undo wrong park"
                          className="text-red-500 hover:text-gray-600 hover:bg-gray-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : source.crawlStatus === "ROBOTS_BLOCKED" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleSourceAction(source.id, "robots_override")}
                          disabled={processingSourceId !== null}
                          title="Override — crawl once (you have permission)"
                          className="text-orange-500 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Unlock className="w-4 h-4" />
                        </Button>
                      ) : source.crawlStatus === "SKIPPED" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleSourceAction(source.id, "unskip")}
                          disabled={processingSourceId !== null}
                          title="Restore — allow crawling again"
                          className="text-orange-500 hover:text-gray-600 hover:bg-gray-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleSourceAction(source.id, "skip")}
                            disabled={processingSourceId !== null}
                            title="Skip — don't crawl this source"
                            className="text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                          >
                            <SkipForward className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleSourceAction(source.id, "wrong_park")}
                            disabled={processingSourceId !== null}
                            title="Wrong Park — this source is about a different park"
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {source.crawlStatus !== "WRONG_PARK" && (
                        <>
                          {!source.isOfficial ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleSourceAction(source.id, "trust")}
                              disabled={processingSourceId !== null}
                              title="Trust — mark as reliable, boost priority"
                              className="text-gray-400 hover:text-green-600 hover:bg-green-50"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleSourceAction(source.id, "untrust")}
                              disabled={processingSourceId !== null}
                              title="Untrust — remove trusted status"
                              className="text-green-600 hover:text-gray-600 hover:bg-gray-50"
                            >
                              <ShieldOff className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CrawlStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-800 border-gray-200",
    SUCCESS: "bg-green-100 text-green-800 border-green-200",
    FAILED: "bg-red-100 text-red-800 border-red-200",
    ROBOTS_BLOCKED: "bg-orange-100 text-orange-800 border-orange-200",
    SKIPPED: "bg-gray-100 text-gray-800 border-gray-200",
    WRONG_PARK: "bg-red-100 text-red-800 border-red-200",
  };

  const labels: Record<string, string> = {
    ROBOTS_BLOCKED: "ROBOTS BLOCKED",
    WRONG_PARK: "WRONG PARK",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
      {labels[status] || status.replace("_", " ")}
    </span>
  );
}

function formatOrigin(origin: string): string {
  const map: Record<string, string> = {
    OPERATOR_PROVIDED: "Operator",
    AI_DISCOVERED: "AI",
    ADMIN_ADDED: "Admin",
    USER_SUBMITTED: "User",
  };
  return map[origin] || origin;
}
