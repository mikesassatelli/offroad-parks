"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users as UsersIcon } from "lucide-react";

export type AssignableRole = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN";

const ASSIGNABLE_ROLES: AssignableRole[] = [
  "USER",
  "OPERATOR",
  "ADMIN",
  "SUPER_ADMIN",
];

export interface ManagedUser {
  id: string;
  name: string | null;
  email: string | null;
  role: AssignableRole;
  submittedParkCount: number;
  createdAt: string;
}

interface UserManagementTableProps {
  users: ManagedUser[];
  /** ID of the currently signed-in viewer (used to disable self-demote). */
  currentUserId: string;
  /** Whether the viewer can edit roles. Only true for SUPER_ADMIN. */
  canEditRoles: boolean;
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "ADMIN":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "OPERATOR":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    default:
      return "bg-muted text-foreground";
  }
}

export function UserManagementTable({
  users,
  currentUserId,
  canEditRoles,
}: UserManagementTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleChange(userId: string, nextRole: AssignableRole) {
    setError(null);
    setSavingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || `Failed to update role (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSavingId(null);
    }
  }

  // Role select (editable) or badge (read-only) — shared by table + cards.
  const renderRoleControl = (user: ManagedUser) => {
    const isSelf = user.id === currentUserId;
    const isSaving = savingId === user.id || pending;
    if (!canEditRoles) {
      return (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${roleBadgeClass(user.role)}`}
        >
          {user.role}
        </span>
      );
    }
    return (
      <select
        aria-label={`Role for ${user.email ?? user.id}`}
        disabled={isSaving}
        value={user.role}
        onChange={(e) =>
          handleRoleChange(user.id, e.target.value as AssignableRole)
        }
        className="text-xs font-medium rounded-md border border-border bg-background px-2 py-1 disabled:opacity-50"
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r} disabled={isSelf && r !== "SUPER_ADMIN"}>
            {r}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Parks Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {users.map((user) => {
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
                          <UsersIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {user.name || "Anonymous"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderRoleControl(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.submittedParkCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout */}
        <div className="md:hidden divide-y divide-border">
          {users.map((user) => (
            <div key={user.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <UsersIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {user.name || "Anonymous"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">{renderRoleControl(user)}</div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{user.submittedParkCount} parks submitted</span>
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
