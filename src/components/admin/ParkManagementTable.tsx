"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Edit, Trash2, MapPin } from "lucide-react";

type ParkStatus = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";

interface Park {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string;
  status: ParkStatus;
  createdAt: Date;
  submitterName: string | null;
  submittedBy: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  terrain: Array<{ terrain: string }>;
  difficulty: Array<{ difficulty: string }>;
  amenities: Array<{ amenity: string }>;
}

interface Props {
  parks: Park[];
  highlightId?: string;
}

export function ParkManagementTable({ parks, highlightId }: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null);

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
      console.error("Error deleting park:", error);
      alert("Failed to delete park");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: ParkStatus) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
      APPROVED: "bg-green-100 text-green-800 border-green-200",
      REJECTED: "bg-red-100 text-red-800 border-red-200",
      DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  if (parks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No parks found
        </h3>
        <p className="text-gray-600">
          No parks match the current filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Park
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submitted By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parks.map((park) => (
              <tr
                key={park.id}
                className={`hover:bg-gray-50 transition-colors ${
                  park.id === highlightId ? "bg-blue-50" : ""
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {park.name}
                  </div>
                  <div className="text-xs text-gray-500">{park.slug}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {park.city ? `${park.city}, ` : ""}
                    {park.state}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(park.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {park.submittedBy?.name || park.submitterName || "Anonymous"}
                  </div>
                  {park.submittedBy?.email && (
                    <div className="text-xs text-gray-500">
                      {park.submittedBy.email}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(park.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {park.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleApprove(park.id)}
                          disabled={processingId === park.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Approve"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReject(park.id)}
                          disabled={processingId === park.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <a
                      href={`/admin/parks/${park.id}/edit`}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => handleDelete(park.id, park.name)}
                      disabled={processingId === park.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}
