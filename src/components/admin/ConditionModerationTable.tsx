"use client";

import {
  ConditionModerationTable as SharedConditionModerationTable,
  type ModerationCondition,
} from "@/components/moderation/ConditionModerationTable";

export type AdminCondition = ModerationCondition;

interface ConditionModerationTableProps {
  conditions: ModerationCondition[];
}

export function ConditionModerationTable({
  conditions,
}: ConditionModerationTableProps) {
  return (
    <SharedConditionModerationTable
      conditions={conditions}
      actions={{
        approve: (id) =>
          fetch(`/api/admin/conditions/${id}/approve`, { method: "POST" }),
        reject: (id) =>
          fetch(`/api/admin/conditions/${id}/reject`, { method: "POST" }),
      }}
    />
  );
}
