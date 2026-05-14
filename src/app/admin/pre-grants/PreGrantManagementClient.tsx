"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2 } from "lucide-react";

type Role = "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN";

const ASSIGNABLE_ROLES: Role[] = ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN"];

export interface PreGrantRow {
  id: string;
  email: string;
  grantRole: Role | null;
  operatorParkSlug: string | null;
  notes: string | null;
  appliedAt: string | null;
  appliedToUserId: string | null;
  createdAt: string;
}

interface Props {
  initialGrants: PreGrantRow[];
}

function roleBadgeClass(role: string | null): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "ADMIN":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "OPERATOR":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "USER":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    default:
      return "bg-muted text-foreground";
  }
}

export function PreGrantManagementClient({ initialGrants }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // New-grant form state.
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [parkSlug, setParkSlug] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/pre-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          grantRole: role || null,
          operatorParkSlug: parkSlug.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `Failed to create (${res.status})`);
      }
      setEmail("");
      setRole("");
      setParkSlug("");
      setNotes("");
      setInfo("Pre-grant created.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, emailLabel: string) {
    if (!confirm(`Delete pre-grant for ${emailLabel}?`)) return;
    setError(null);
    setInfo(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/pre-grants/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || `Failed to delete (${res.status})`);
      }
      setInfo(`Pre-grant for ${emailLabel} deleted.`);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleApplyNow(id: string, emailLabel: string) {
    setError(null);
    setInfo(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/pre-grants/${id}/apply`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        result?: { status?: string };
      } | null;
      if (!res.ok) {
        throw new Error(data?.error || `Failed to apply (${res.status})`);
      }
      setInfo(
        `Apply result for ${emailLabel}: ${data?.result?.status ?? "applied"}.`,
      );
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Banner messages */}
      {error && (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-100"
          role="alert"
        >
          {error}
        </div>
      )}
      {info && (
        <div
          className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900 dark:bg-green-950/40 dark:border-green-900 dark:text-green-100"
          role="status"
        >
          {info}
        </div>
      )}

      {/* Create form */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-base font-semibold mb-4">Add pre-grant</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="pre-grant-email" className="text-sm font-medium">
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="pre-grant-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="tester@example.com"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="pre-grant-role" className="text-sm font-medium">
              Grant role
            </label>
            <select
              id="pre-grant-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role | "")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">— No role change —</option>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="pre-grant-park" className="text-sm font-medium">
              Operator-of park slug
            </label>
            <input
              id="pre-grant-park"
              type="text"
              value={parkSlug}
              onChange={(e) => setParkSlug(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="gypsum-city-ohv-park-iowa"
            />
            <p className="text-xs text-muted-foreground">
              Park slug — found in the URL of the park detail page.
            </p>
          </div>
          <div className="space-y-1">
            <label htmlFor="pre-grant-notes" className="text-sm font-medium">
              Notes
            </label>
            <input
              id="pre-grant-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Beta tester from acme"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={creating || pending}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Add pre-grant"}
            </button>
            <p className="text-xs text-muted-foreground">
              Applied automatically when the email signs in for the first time.
            </p>
          </div>
        </form>
      </section>

      {/* Table */}
      <section className="rounded-lg border border-border bg-card">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">
            All pre-grants ({initialGrants.length})
          </h2>
        </div>
        {initialGrants.length === 0 ? (
          <div className="px-6 py-8 text-sm text-muted-foreground text-center">
            No pre-grants yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground bg-muted/30">
                <tr>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Operator park</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Notes</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialGrants.map((g) => {
                  const applied = !!g.appliedAt;
                  const isBusy = busyId === g.id;
                  return (
                    <tr key={g.id} className="border-t border-border">
                      <td className="px-6 py-3 font-medium">{g.email}</td>
                      <td className="px-6 py-3">
                        {g.grantRole ? (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(g.grantRole)}`}
                          >
                            {g.grantRole}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {g.operatorParkSlug ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {g.operatorParkSlug}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {applied ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Applied
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 dark:text-amber-400">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {g.notes ?? "—"}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {!applied && (
                            <button
                              type="button"
                              disabled={isBusy || pending}
                              onClick={() => handleApplyNow(g.id, g.email)}
                              className="text-xs rounded-md border border-border px-2 py-1 hover:bg-accent disabled:opacity-50"
                              title="Apply now if the user has already signed in"
                            >
                              Apply now
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy || pending}
                            onClick={() => handleDelete(g.id, g.email)}
                            className="text-xs rounded-md border border-red-300 text-red-700 px-2 py-1 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
