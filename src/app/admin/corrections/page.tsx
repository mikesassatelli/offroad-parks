"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  MessageSquareWarning,
  User,
  MapPin,
} from "lucide-react";
import { ReadOnlyGate } from "@/components/admin/read-only";

type CorrectionStatus = "PENDING" | "RESOLVED" | "DISMISSED";

interface CorrectionReport {
  id: string;
  note: string;
  status: CorrectionStatus;
  createdAt: string;
  park: { id: string; name: string; slug: string };
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export default function AdminCorrectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") as CorrectionStatus) || "PENDING";

  const [reports, setReports] = useState<CorrectionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/corrections?status=${status}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
      }
    } catch (error) {
      console.error("Error fetching corrections:", error);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleStatusChange = (newStatus: string) => {
    router.push(`/admin/corrections?status=${newStatus}`);
  };

  const handleAction = async (
    id: string,
    nextStatus: "RESOLVED" | "DISMISSED",
  ) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/admin/corrections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (response.ok) {
        fetchReports();
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || "Failed to update report");
      }
    } catch {
      alert("Failed to update report");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadgeVariant = (s: CorrectionStatus) => {
    if (s === "RESOLVED") return "default";
    if (s === "DISMISSED") return "destructive";
    return "secondary";
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquareWarning className="w-7 h-7" />
          Correction Reports
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Free-text corrections submitted from park pages. Field-level
          corrections appear in AI Research → Review.
        </p>
      </div>

      <Tabs value={status} onValueChange={handleStatusChange} className="mb-6">
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="RESOLVED">Resolved</TabsTrigger>
          <TabsTrigger value="DISMISSED">Dismissed</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No {status.toLowerCase()} correction reports.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">
                    <a
                      href={`/parks/${report.park.slug}`}
                      className="hover:underline text-primary flex items-center gap-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="w-4 h-4" />
                      {report.park.name}
                    </a>
                  </CardTitle>
                  <Badge variant={statusBadgeVariant(report.status)}>
                    {report.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="bg-muted rounded-md px-3 py-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {report.note}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3.5 h-3.5" />
                  <span>{report.user.name || report.user.email || "Unknown user"}</span>
                  <span>·</span>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>

                {report.status === "PENDING" && (
                  <div className="flex gap-2 pt-1">
                    <ReadOnlyGate className="flex-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAction(report.id, "RESOLVED")}
                        disabled={actionLoading === report.id}
                        data-testid={`resolve-${report.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {actionLoading === report.id ? "Processing…" : "Resolve"}
                      </Button>
                    </ReadOnlyGate>
                    <ReadOnlyGate className="flex-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleAction(report.id, "DISMISSED")}
                        disabled={actionLoading === report.id}
                        data-testid={`dismiss-${report.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                    </ReadOnlyGate>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
