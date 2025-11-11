"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, ExternalLink, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  status: string;
  createdAt: Date;
  park: {
    name: string;
    slug: string;
  };
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

interface PhotoModerationTableProps {
  photos: Photo[];
}

export function PhotoModerationTable({ photos }: PhotoModerationTableProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredPhotos =
    filter === "ALL" ? photos : photos.filter((p) => p.status === filter);

  const handleApprove = async (photoId: string) => {
    setProcessingId(photoId);
    try {
      const response = await fetch(`/api/admin/photos/${photoId}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to approve photo");
      }
    } catch (error) {
      /* v8 ignore next - Network error logging only */
      console.error("Failed to approve photo:", error);
      alert("Failed to approve photo");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (photoId: string) => {
    setProcessingId(photoId);
    try {
      const response = await fetch(`/api/admin/photos/${photoId}/reject`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to reject photo");
      }
    } catch (error) {
      /* v8 ignore next - Network error logging only */
      console.error("Failed to reject photo:", error);
      alert("Failed to reject photo");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    setProcessingId(photoId);
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to delete photo");
      }
    } catch (error) {
      /* v8 ignore next - Network error logging only */
      console.error("Failed to delete photo:", error);
      alert("Failed to delete photo");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-orange-100 text-orange-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Filter Tabs */}
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex gap-2">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {status}
              {status !== "ALL" && (
                <span className="ml-2 text-xs">
                  (
                  {
                    /* v8 ignore next - status is always !== "ALL" here due to outer condition */
                    status === "ALL"
                      ? photos.length
                      : photos.filter((p) => p.status === status).length
                  }
                  )
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Photos Grid */}
      <div className="p-6">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No photos found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Photo */}
                <div className="relative h-48 bg-gray-100">
                  <Image
                    src={photo.url}
                    alt={photo.caption || "Park photo"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                {/* Details */}
                <div className="p-4 space-y-3">
                  {/* Park */}
                  <div>
                    <Link
                      href={`/parks/${photo.park.slug}`}
                      className="font-medium text-gray-900 hover:text-primary flex items-center gap-1"
                    >
                      {photo.park.name}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Caption */}
                  {photo.caption && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {photo.caption}
                    </p>
                  )}

                  {/* Uploader */}
                  <div className="text-xs text-gray-500">
                    Uploaded by: {photo.user?.name || "Unknown"}
                  </div>

                  {/* Date */}
                  <div className="text-xs text-gray-500">
                    {new Date(photo.createdAt).toLocaleDateString()}
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(photo.status)}`}
                    >
                      {photo.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {photo.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(photo.id)}
                          disabled={processingId === photo.id}
                          className="flex-1"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(photo.id)}
                          disabled={processingId === photo.id}
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {photo.status === "REJECTED" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(photo.id)}
                          disabled={processingId === photo.id}
                          className="flex-1"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(photo.id)}
                          disabled={processingId === photo.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {photo.status === "APPROVED" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(photo.id)}
                        disabled={processingId === photo.id}
                        className="flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
