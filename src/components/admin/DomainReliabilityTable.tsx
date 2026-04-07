"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DomainReliabilitySummary } from "@/lib/types";

type Props = {
  domains: DomainReliabilitySummary[];
};

export function DomainReliabilityTable({ domains }: Props) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [newPattern, setNewPattern] = useState("");
  const [newReliability, setNewReliability] = useState(50);
  const [newBlocked, setNewBlocked] = useState(false);
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit form state
  const [editReliability, setEditReliability] = useState(50);
  const [editBlocked, setEditBlocked] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPattern.trim()) return;

    setAdding(true);
    try {
      const response = await fetch("/api/admin/ai-research/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainPattern: newPattern.trim(),
          defaultReliability: newReliability,
          isBlocked: newBlocked,
          notes: newNotes.trim() || null,
        }),
      });
      if (response.ok) {
        setNewPattern("");
        setNewReliability(50);
        setNewBlocked(false);
        setNewNotes("");
        setShowAddForm(false);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to add domain");
      }
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (domain: DomainReliabilitySummary) => {
    setEditingId(domain.id);
    setEditReliability(domain.defaultReliability);
    setEditBlocked(domain.isBlocked);
    setEditNotes(domain.notes || "");
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/ai-research/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          defaultReliability: editReliability,
          isBlocked: editBlocked,
          notes: editNotes.trim() || null,
        }),
      });
      if (response.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update domain");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, pattern: string) => {
    if (!confirm(`Delete domain entry "${pattern}"?`)) return;

    try {
      const response = await fetch("/api/admin/ai-research/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete domain");
      }
    } catch {
      alert("Network error");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Domain Reliability
          </h2>
          <p className="text-xs text-gray-500">
            Default reliability scores assigned to new sources based on their
            domain. Suffix patterns (e.g. .gov) match all subdomains.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Domain
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain Pattern
              </label>
              <input
                type="text"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder=".gov or example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reliability (0-100)
              </label>
              <input
                type="number"
                value={newReliability}
                onChange={(e) => setNewReliability(Number(e.target.value))}
                min={0}
                max={100}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Optional description"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
                <input
                  type="checkbox"
                  checked={newBlocked}
                  onChange={(e) => setNewBlocked(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Blocked
              </label>
              <Button type="submit" size="sm" disabled={adding}>
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Table */}
      {domains.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500 text-sm">
            No domain reliability entries yet. Add one above.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Domain Pattern
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reliability
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {domains.map((domain) => (
                <tr key={domain.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    {domain.domainPattern}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === domain.id ? (
                      <input
                        type="number"
                        value={editReliability}
                        onChange={(e) =>
                          setEditReliability(Number(e.target.value))
                        }
                        min={0}
                        max={100}
                        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <span
                        className={`text-sm font-medium ${
                          domain.defaultReliability >= 70
                            ? "text-green-700"
                            : domain.defaultReliability >= 40
                              ? "text-yellow-700"
                              : "text-red-700"
                        }`}
                      >
                        {domain.defaultReliability}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === domain.id ? (
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editBlocked}
                          onChange={(e) => setEditBlocked(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        Blocked
                      </label>
                    ) : domain.isBlocked ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-100 text-red-800 border-red-200">
                        Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === domain.id ? (
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="text-sm text-gray-500">
                        {domain.notes || "--"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {editingId === domain.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleSave(domain.id)}
                            disabled={saving}
                            title="Save"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditingId(null)}
                            title="Cancel"
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => startEdit(domain)}
                            title="Edit"
                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              handleDelete(domain.id, domain.domainPattern)
                            }
                            title="Delete"
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
