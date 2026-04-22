"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ParkAlertSeverity } from "@prisma/client";

const SEVERITY_OPTIONS: Array<{
  value: ParkAlertSeverity;
  label: string;
  color: string;
}> = [
  { value: "INFO", label: "Info", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "SUCCESS", label: "Success", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "WARNING", label: "Warning", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "DANGER", label: "Danger", color: "bg-red-100 text-red-800 border-red-200" },
];

const SEVERITY_ICON: Record<ParkAlertSeverity, typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  DANGER: AlertOctagon,
};

interface AlertRecord {
  id: string;
  title: string;
  body: string | null;
  severity: ParkAlertSeverity;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null };
}

interface OperatorAlertsClientProps {
  parkSlug: string;
  parkName: string;
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function OperatorAlertsClient({ parkSlug, parkName }: OperatorAlertsClientProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<ParkAlertSeverity>("INFO");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const resetForm = () => {
    setTitle("");
    setBody("");
    setSeverity("INFO");
    setStartsAt("");
    setExpiresAt("");
    setEditingId(null);
    setError(null);
  };

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/operator/parks/${parkSlug}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, [parkSlug]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const url = editingId
        ? `/api/operator/parks/${parkSlug}/alerts/${editingId}`
        : `/api/operator/parks/${parkSlug}/alerts`;
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body: body || null,
          severity,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save alert");
        return;
      }
      setSuccess(true);
      resetForm();
      fetchAlerts();
    } catch {
      setError("Failed to save alert. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (alert: AlertRecord) => {
    setEditingId(alert.id);
    setTitle(alert.title);
    setBody(alert.body ?? "");
    setSeverity(alert.severity);
    setStartsAt(toDateTimeLocal(alert.startsAt));
    setExpiresAt(toDateTimeLocal(alert.expiresAt));
    setError(null);
    setSuccess(false);
  };

  const handleToggleActive = async (alert: AlertRecord) => {
    try {
      const res = await fetch(`/api/operator/parks/${parkSlug}/alerts/${alert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !alert.isActive }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, isActive: !alert.isActive } : a))
        );
      }
    } catch {
      // Non-critical
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!confirm("Delete this alert? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/operator/parks/${parkSlug}/alerts/${alertId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        if (editingId === alertId) resetForm();
      }
    } catch {
      // Non-critical
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6" />
          Park Alerts
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Post closure notices, event announcements, or weather warnings for {parkName}.
          Active alerts appear as dismissible banners at the top of your public park page.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Create / edit form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit Alert" : "Create a New Alert"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="alert-form">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  placeholder="e.g. Main gate closed for repairs this weekend"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Details (optional)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  rows={3}
                  placeholder="Additional context for visitors."
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Severity</p>
                <div className="grid grid-cols-4 gap-2">
                  {SEVERITY_OPTIONS.map((opt) => {
                    const OptIcon = SEVERITY_ICON[opt.value];
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSeverity(opt.value)}
                        className={`flex items-center justify-center gap-1.5 text-xs px-2 py-2 rounded-md border transition-all ${
                          severity === opt.value
                            ? `${opt.color} font-semibold ring-2 ring-offset-1 ring-blue-400`
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <OptIcon className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Starts at (optional)</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Expires at (optional)</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
              {success && (
                <p className="text-xs text-green-600 font-medium">Alert saved successfully!</p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting
                    ? "Saving…"
                    : editingId
                      ? "Update Alert"
                      : "Create Alert"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Alert list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Existing Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"
                  />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts posted yet.</p>
            ) : (
              <ul className="space-y-3">
                {alerts.map((alert) => {
                  const SevIcon = SEVERITY_ICON[alert.severity];
                  const sevOption = SEVERITY_OPTIONS.find((o) => o.value === alert.severity);
                  return (
                    <li
                      key={alert.id}
                      className="border border-border rounded-md p-3 space-y-2"
                      data-testid={`alert-row-${alert.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <SevIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{alert.title}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${sevOption?.color ?? ""}`}
                            >
                              {sevOption?.label ?? alert.severity}
                            </Badge>
                            {!alert.isActive && (
                              <Badge variant="outline" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {alert.body && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {alert.body}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {alert.startsAt && (
                              <span>
                                Starts {new Date(alert.startsAt).toLocaleString()}.{" "}
                              </span>
                            )}
                            {alert.expiresAt ? (
                              <span>
                                Expires {new Date(alert.expiresAt).toLocaleString()}.
                              </span>
                            ) : (
                              <span>No expiration.</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleToggleActive(alert)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          aria-label={
                            alert.isActive ? "Deactivate alert" : "Reactivate alert"
                          }
                        >
                          {alert.isActive ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              Reactivate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(alert)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          aria-label="Edit alert"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(alert.id)}
                          className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1"
                          aria-label="Delete alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
