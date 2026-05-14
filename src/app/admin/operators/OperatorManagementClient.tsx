"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  Plus,
  Trash2,
  X,
} from "lucide-react";

export interface AdminOperatorRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  subscriptionStatus: string;
  subscriptionTier: string;
  createdAt: string;
  parks: Array<{ id: string; slug: string; name: string }>;
  users: Array<{
    id: string;
    role: string;
    createdAt: string;
    user: {
      id: string;
      email: string | null;
      name: string | null;
      image: string | null;
    };
  }>;
}

interface Props {
  initialOperators: AdminOperatorRow[];
}

export function OperatorManagementClient({ initialOperators }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function call(path: string, init: RequestInit): Promise<unknown> {
    const res = await fetch(path, init);
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    if (!res.ok) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
    return data;
  }

  // --- Create operator form state ---
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newParkSlug, setNewParkSlug] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setCreating(true);
    try {
      const data = (await call("/api/admin/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || null,
          website: newWebsite.trim() || null,
          initialParkSlug: newParkSlug.trim() || null,
          initialOwnerEmail: newOwnerEmail.trim() || null,
        }),
      })) as { hints?: { ownerEmailSkipped?: string | null } } | null;
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewWebsite("");
      setNewParkSlug("");
      setNewOwnerEmail("");
      setInfo(data?.hints?.ownerEmailSkipped || "Operator created.");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteOperator(op: AdminOperatorRow) {
    const parkCount = op.parks.length;
    const userCount = op.users.length;
    const warning =
      parkCount + userCount > 0
        ? `Delete operator '${op.name}'? ${parkCount} park(s) will be detached and ${userCount} user membership(s) will be removed.`
        : `Delete operator '${op.name}'?`;
    if (!confirm(warning)) return;
    setError(null);
    setInfo(null);
    setBusyId(op.id);
    try {
      await call(`/api/admin/operators/${op.id}`, { method: "DELETE" });
      setInfo(`Operator '${op.name}' deleted.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveUser(opId: string, userId: string, label: string) {
    if (!confirm(`Remove ${label} from this operator?`)) return;
    setError(null);
    setInfo(null);
    setBusyId(opId);
    try {
      await call(`/api/admin/operators/${opId}/users/${userId}`, {
        method: "DELETE",
      });
      setInfo(`${label} removed.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove user");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddUser(opId: string, email: string, role: string) {
    setError(null);
    setInfo(null);
    setBusyId(opId);
    try {
      await call(`/api/admin/operators/${opId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      setInfo(`Added ${email} as ${role}.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add user");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDetachPark(opId: string, parkId: string, label: string) {
    if (!confirm(`Detach park '${label}' from this operator?`)) return;
    setError(null);
    setInfo(null);
    setBusyId(opId);
    try {
      await call(`/api/admin/operators/${opId}/parks/${parkId}`, {
        method: "DELETE",
      });
      setInfo(`Detached '${label}'.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to detach park");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAttachPark(opId: string, slug: string) {
    setError(null);
    setInfo(null);
    setBusyId(opId);
    try {
      await call(`/api/admin/operators/${opId}/parks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkSlug: slug }),
      });
      setInfo(`Attached '${slug}'.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach park");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
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
        <h2 className="text-base font-semibold mb-4">Create operator</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="op-name"
            label="Org name"
            required
            value={newName}
            onChange={setNewName}
            placeholder="Acme Trails LLC"
          />
          <Input
            id="op-email"
            label="Contact email"
            required
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            placeholder="contact@acme.com"
          />
          <Input
            id="op-phone"
            label="Phone"
            value={newPhone}
            onChange={setNewPhone}
            placeholder="+1 555-0123"
          />
          <Input
            id="op-website"
            label="Website"
            value={newWebsite}
            onChange={setNewWebsite}
            placeholder="https://acme.com"
          />
          <Input
            id="op-park"
            label="Initial park slug (optional)"
            value={newParkSlug}
            onChange={setNewParkSlug}
            placeholder="gypsum-city-ohv-park-iowa"
            hint="Attach a park at creation time."
          />
          <Input
            id="op-owner"
            label="Initial owner email (optional)"
            value={newOwnerEmail}
            onChange={setNewOwnerEmail}
            placeholder="owner@acme.com"
            hint="User must already exist. If not, use Pre-grants."
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creating || pending}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              {creating ? "Creating…" : "Create operator"}
            </button>
          </div>
        </form>
      </section>

      {/* Operator list */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          All operators ({initialOperators.length})
        </h2>
        {initialOperators.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-6 py-8 text-sm text-muted-foreground text-center">
            No operators yet.
          </div>
        ) : (
          initialOperators.map((op) => (
            <OperatorRow
              key={op.id}
              op={op}
              expanded={expanded.has(op.id)}
              onToggle={() => toggleExpanded(op.id)}
              busy={busyId === op.id || pending}
              onDeleteOperator={() => handleDeleteOperator(op)}
              onRemoveUser={(uid, label) => handleRemoveUser(op.id, uid, label)}
              onAddUser={(email, role) => handleAddUser(op.id, email, role)}
              onDetachPark={(pid, label) => handleDetachPark(op.id, pid, label)}
              onAttachPark={(slug) => handleAttachPark(op.id, slug)}
              onSavedEdit={refresh}
              onError={(msg) => setError(msg)}
            />
          ))
        )}
      </section>
    </div>
  );
}

function Input({
  id,
  label,
  required,
  type,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={id}
        type={type ?? "text"}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function OperatorRow({
  op,
  expanded,
  onToggle,
  busy,
  onDeleteOperator,
  onRemoveUser,
  onAddUser,
  onDetachPark,
  onAttachPark,
  onSavedEdit,
  onError,
}: {
  op: AdminOperatorRow;
  expanded: boolean;
  onToggle: () => void;
  busy: boolean;
  onDeleteOperator: () => void;
  onRemoveUser: (userId: string, label: string) => void;
  onAddUser: (email: string, role: string) => void;
  onDetachPark: (parkId: string, label: string) => void;
  onAttachPark: (slug: string) => void;
  onSavedEdit: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(op.name);
  const [email, setEmail] = useState(op.email);
  const [phone, setPhone] = useState(op.phone ?? "");
  const [website, setWebsite] = useState(op.website ?? "");
  const [saving, setSaving] = useState(false);

  const [addUserEmail, setAddUserEmail] = useState("");
  const [addUserRole, setAddUserRole] = useState("OWNER");
  const [attachSlug, setAttachSlug] = useState("");

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/operators/${op.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          website: website.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
      setEditing(false);
      onSavedEdit();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 px-6 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input id={`edit-name-${op.id}`} label="Org name" required value={name} onChange={setName} />
              <Input id={`edit-email-${op.id}`} label="Email" required type="email" value={email} onChange={setEmail} />
              <Input id={`edit-phone-${op.id}`} label="Phone" value={phone} onChange={setPhone} />
              <Input id={`edit-website-${op.id}`} label="Website" value={website} onChange={setWebsite} />
            </div>
          ) : (
            <>
              {/* subscriptionStatus + subscriptionTier are Stripe-billing
                  scaffolding (E14, not yet shipped). Every operator stays
                  on the TRIALING · STANDARD defaults until Stripe webhooks
                  cycle them, so showing them is just noise today. The
                  fields are still returned in the API + kept on the row
                  type — easy to unhide once OP-67/68 ship. */}
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="font-semibold">{op.name}</h3>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {op.email}
                </span>
                {op.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {op.phone}
                  </span>
                )}
                {op.website && (
                  <a
                    href={op.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {op.website}
                  </a>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {op.parks.length} park{op.parks.length === 1 ? "" : "s"} ·{" "}
                {op.users.length} user{op.users.length === 1 ? "" : "s"}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="text-xs rounded-md bg-primary text-primary-foreground px-3 py-1 hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(op.name);
                  setEmail(op.email);
                  setPhone(op.phone ?? "");
                  setWebsite(op.website ?? "");
                }}
                className="text-xs rounded-md border border-border px-3 py-1 hover:bg-accent"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(true)}
                className="text-xs rounded-md border border-border px-3 py-1 hover:bg-accent disabled:opacity-50"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onDeleteOperator}
                className="text-xs rounded-md border border-red-300 text-red-700 px-2 py-1 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Parks panel */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Parks</h4>
            {op.parks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No parks attached.</p>
            ) : (
              <ul className="space-y-1">
                {op.parks.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded border border-border px-3 py-1.5"
                  >
                    <Link href={`/parks/${p.slug}`} className="text-sm hover:underline">
                      {p.name}
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDetachPark(p.id, p.name)}
                      className="text-xs text-muted-foreground hover:text-red-700 disabled:opacity-50 inline-flex items-center gap-1"
                      title="Detach park"
                    >
                      <X className="w-3 h-3" />
                      Detach
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (attachSlug.trim()) {
                  onAttachPark(attachSlug.trim());
                  setAttachSlug("");
                }
              }}
              className="mt-3 flex gap-2"
            >
              <input
                value={attachSlug}
                onChange={(e) => setAttachSlug(e.target.value)}
                placeholder="park-slug-to-attach"
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !attachSlug.trim()}
                className="text-xs rounded-md border border-border px-3 py-1.5 hover:bg-accent disabled:opacity-50"
              >
                Attach
              </button>
            </form>
          </div>

          {/* Users panel */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Users</h4>
            {op.users.length === 0 ? (
              <p className="text-xs text-muted-foreground">No users on this operator.</p>
            ) : (
              <ul className="space-y-1">
                {op.users.map((m) => {
                  const label = m.user.email || m.user.name || m.user.id;
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded border border-border px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate">{label}</span>
                        <span className="text-[10px] uppercase tracking-wide rounded bg-muted px-1.5 py-0.5">
                          {m.role}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onRemoveUser(m.user.id, label)}
                        className="text-xs text-muted-foreground hover:text-red-700 disabled:opacity-50 inline-flex items-center gap-1"
                        title="Remove user"
                      >
                        <X className="w-3 h-3" />
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (addUserEmail.trim()) {
                  onAddUser(addUserEmail.trim(), addUserRole);
                  setAddUserEmail("");
                }
              }}
              className="mt-3 flex gap-2"
            >
              <input
                type="email"
                value={addUserEmail}
                onChange={(e) => setAddUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
              <select
                value={addUserRole}
                onChange={(e) => setAddUserRole(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="OWNER">OWNER</option>
                <option value="MEMBER">MEMBER</option>
              </select>
              <button
                type="submit"
                disabled={busy || !addUserEmail.trim()}
                className="text-xs rounded-md border border-border px-3 py-1.5 hover:bg-accent disabled:opacity-50"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
