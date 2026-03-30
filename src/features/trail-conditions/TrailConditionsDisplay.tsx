"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrailConditionForm } from "./TrailConditionForm";
import {
  formatConditionAge,
  isConditionFresh,
  CONDITION_LABELS,
} from "@/lib/trail-conditions";
import type { TrailConditionReport } from "@/lib/trail-conditions";
import { CloudSun, ShieldCheck } from "lucide-react";

interface TrailConditionsDisplayProps {
  parkSlug: string;
}

const COLOR_CLASS: Record<string, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  red: "bg-red-100 text-red-800 border-red-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  sky: "bg-sky-100 text-sky-800 border-sky-200",
};

export function TrailConditionsDisplay({ parkSlug }: TrailConditionsDisplayProps) {
  const { data: session } = useSession();
  const [conditions, setConditions] = useState<TrailConditionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadConditions = useCallback(async () => {
    try {
      const res = await fetch(`/api/parks/${parkSlug}/conditions`);
      if (!res.ok) return;
      const data = await res.json();
      setConditions(data.conditions ?? []);
    } catch {
      // Silent — conditions are non-critical
    } finally {
      setLoading(false);
    }
  }, [parkSlug]);

  useEffect(() => {
    loadConditions();
  }, [loadConditions]);

  const freshConditions = conditions.filter((c) => isConditionFresh(c.createdAt));
  const mostRecent = freshConditions[0] ?? null;

  const handleReportSuccess = () => {
    setShowForm(false);
    loadConditions();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CloudSun className="w-4 h-4" />
            Trail Conditions
          </CardTitle>
          {session?.user && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-primary underline underline-offset-2 hover:opacity-80"
            >
              Report condition
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && session?.user && (
          <TrailConditionForm
            parkSlug={parkSlug}
            onSuccess={handleReportSuccess}
          />
        )}

        {!session?.user && (
          <p className="text-xs text-muted-foreground">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/auth/signin" className="text-primary underline underline-offset-2 font-medium hover:opacity-80">
              Sign in
            </a>{" "}
            to report trail conditions.
          </p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading conditions…</p>
        ) : freshConditions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent condition reports. Be the first to report!
          </p>
        ) : (
          <div className="space-y-2">
            {mostRecent && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={COLOR_CLASS[CONDITION_LABELS[mostRecent.status].color]}
                >
                  {CONDITION_LABELS[mostRecent.status].label}
                </Badge>
                {mostRecent.isOperatorPost && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 text-[10px] py-0 bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Park Management
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  reported {formatConditionAge(mostRecent.createdAt)}
                  {!mostRecent.isOperatorPost && mostRecent.user.name
                    ? ` by ${mostRecent.user.name}`
                    : ""}
                </span>
              </div>
            )}
            {mostRecent?.note && (
              <p className="text-sm text-card-foreground/90 italic">
                &ldquo;{mostRecent.note}&rdquo;
              </p>
            )}
            {freshConditions.length > 1 && (
              <div className="border-t pt-2 mt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Recent reports</p>
                {freshConditions.slice(1, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 ${COLOR_CLASS[CONDITION_LABELS[c.status].color]}`}
                    >
                      {CONDITION_LABELS[c.status].label}
                    </Badge>
                    <span>{formatConditionAge(c.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
