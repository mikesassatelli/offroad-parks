"use client";

import {
  ConditionModerationTable,
  type ModerationCondition,
} from "@/components/moderation/ConditionModerationTable";

interface OperatorConditionsModerationClientProps {
  parkSlug: string;
  conditions: ModerationCondition[];
}

export function OperatorConditionsModerationClient({
  parkSlug,
  conditions,
}: OperatorConditionsModerationClientProps) {
  const apiBase = `/api/operator/parks/${parkSlug}/conditions`;

  return (
    <ConditionModerationTable
      conditions={conditions}
      showParkColumn={false}
      actions={{
        approve: (id) =>
          fetch(`${apiBase}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reportStatus: "PUBLISHED" }),
          }),
        reject: (id) =>
          fetch(`${apiBase}/${id}`, {
            method: "DELETE",
          }),
      }}
    />
  );
}
