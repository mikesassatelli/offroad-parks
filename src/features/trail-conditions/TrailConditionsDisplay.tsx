"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrailConditionForm } from "./TrailConditionForm";
import {
  formatConditionAge,
  isConditionFresh,
  isConditionPinned,
  CONDITION_LABELS,
} from "@/lib/trail-conditions";
import type { TrailConditionReport } from "@/lib/trail-conditions";
import { CloudSun, Pin, ShieldCheck, Trash2 } from "lucide-react";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const myActiveCondition = session?.user?.id
    ? conditions.find(
        (c) => c.userId === session.user!.id && isConditionFresh(c.createdAt)
      ) ?? null
    : null;

  const freshConditions = conditions.filter(
    (c) => isConditionFresh(c.createdAt) || isConditionPinned(c.pinnedUntil)
  );
  const activePin = freshConditions.find((c) => isConditionPinned(c.pinnedUntil)) ?? null;
  const recentOperatorPost = freshConditions.find((c) => c.isOperatorPost) ?? null;
  const featured = activePin ?? recentOperatorPost ?? freshConditions[0] ?? null;
  const communityList = freshConditions.filter((c) => c.id !== featured?.id).slice(0, 4);

  const handleReportSuccess = () => {
    setShowForm(false);
    loadConditions();
  };

  const handleDeleteOwn = async (conditionId: string) => {
    setDeletingId(conditionId);
    try {
      const res = await fetch(`/api/parks/${parkSlug}/conditions/${conditionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConditions((prev) => prev.filter((c) => c.id !== conditionId));
      }
    } catch {
      // Non-critical
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CloudSun className="w-4 h-4" />
            Trail Conditions
          </CardTitle>
          {session?.user && !showForm && !myActiveCondition && (
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
            {featured && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={COLOR_CLASS[CONDITION_LABELS[featured.status].color]}
                >
                  {CONDITION_LABELS[featured.status].label}
                </Badge>
                {featured.isOperatorPost && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 text-[10px] py-0 bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Park Operator
                  </Badge>
                )}
                {isConditionPinned(featured.pinnedUntil) && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 text-[10px] py-0 bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <Pin className="w-3 h-3" />
                    Until {new Date(featured.pinnedUntil!).toLocaleDateString()}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {isConditionPinned(featured.pinnedUntil)
                    ? `posted ${formatConditionAge(featured.createdAt)}`
                    : `reported ${formatConditionAge(featured.createdAt)}${
                        !featured.isOperatorPost && featured.user.name
                          ? ` by ${featured.user.name}`
                          : ""
                      }`}
                </span>
                {session?.user && !featured.isOperatorPost && featured.userId === session.user.id && (
                  <button
                    onClick={() => handleDeleteOwn(featured.id)}
                    disabled={deletingId === featured.id}
                    className="ml-auto text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                    aria-label="Delete my report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {featured?.note && (
              <p className="text-sm text-card-foreground/90 italic">
                &ldquo;{featured.note}&rdquo;
              </p>
            )}
            {communityList.length > 0 && (
              <div className="border-t pt-2 mt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Recent reports</p>
                {communityList.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 ${COLOR_CLASS[CONDITION_LABELS[c.status].color]}`}
                    >
                      {CONDITION_LABELS[c.status].label}
                    </Badge>
                    {c.isOperatorPost && (
                      <ShieldCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    )}
                    <span>{formatConditionAge(c.createdAt)}</span>
                    {c.user.name && !c.isOperatorPost && (
                      <span className="text-xs">· {c.user.name}</span>
                    )}
                    {session?.user && !c.isOperatorPost && c.userId === session.user.id && (
                      <button
                        onClick={() => handleDeleteOwn(c.id)}
                        disabled={deletingId === c.id}
                        className="ml-auto text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                        aria-label="Delete my report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
