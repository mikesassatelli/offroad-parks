"use client";

import { useState } from "react";
import { Camera, CheckCircle, Edit, MapPin, Trash2, XCircle } from "lucide-react";

type ParkStatus = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";

interface Park {
  id: string;
  name: string;
  slug: string;
  status: ParkStatus;
  createdAt: Date;
  submitterName: string | null;
  submittedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  terrain: Array<{ terrain: string }>;
  amenities: Array<{ amenity: string }>;
  address: {
    city: string | null;
    state: string;
  } | null;
  photos: Array<{ id: string }>;
}

interface Props {
  parks: Park[];
  highlightId?: string;
}

export function ParkManagementTable({ parks, highlightId }: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredParks = parks.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.address?.city ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.address?.state ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleApprove = async (parkId: string) => {
    setProcessingId(parkId);
    try {
      const response = await fetch(`/api/admin/parks/${parkId}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to approve park");
      }
    } catch (error) {
      /* v8 ignore next - Network error logging only */
      console.error("Error approving park:", error);
      alert("Failed to approve park");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (parkId: string) => {
    setProcessingId(parkId);
    try {
      const response = await fetch(`/api/admin/parks/${parkId}/reject`, {
        method: "POST",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to reject park");
      }
    } catch (error) {
      console.error("Error rejecting park:", error);
      alert("Failed to reject park");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (parkId: string, parkName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${parkName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setProcessingId(parkId);
    try {
      const response = await fetch(`/api/admin/parks/${parkId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to delete park");
      }
    } catch (error) {
      /* v8 ignore next - Network error logging only */
      console.error("Error deleting park:", error);
      alert("Failed to delete park");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: ParkStatus) => {
    const styles = {
      PENDING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50",
      APPROVED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900/50",
      REJECTED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50",
      DRAFT: "bg-muted text-foreground border-border",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
      <div className="px-6 py-3 border-b border-border">
        <input
          type="text"
          placeholder="Search by name, city, or state..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
      </div>
      {filteredParks.length === 0 ? (
        <div className="p-12 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No parks found
          </h3>
          <p className="text-muted-foreground">
            No parks match the current filter criteria.
          </p>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Park
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Submitted By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredParks.map((park) => (
              <tr
                key={park.id}
                className={`hover:bg-accent/50 transition-colors ${
                  park.id === highlightId ? "bg-primary/10" : ""
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-foreground">
                      {park.name}
                    </div>
                    {park.status === "APPROVED" && park.photos.length === 0 && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50"
                        title="No approved photos"
                      >
                        <Camera className="w-2.5 h-2.5" />
                        No photos
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{park.slug}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">
                    {park.address?.city ? `${park.address.city}, ` : ""}
                    {park.address?.state ?? "Unknown"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(park.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">
                    {park.submittedBy?.name ||
                      park.submitterName ||
                      "Anonymous"}
                  </div>
                  {park.submittedBy?.email && (
                    <div className="text-xs text-muted-foreground">
                      {park.submittedBy.email}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(park.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {park.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleApprove(park.id)}
                          disabled={processingId === park.id}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReject(park.id)}
                          disabled={processingId === park.id}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <a
                      href={`/admin/parks/${park.id}/edit`}
                      className="text-primary hover:text-primary/80"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => handleDelete(park.id, park.name)}
                      disabled={processingId === park.id}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
