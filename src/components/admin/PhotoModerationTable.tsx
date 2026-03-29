"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, ExternalLink, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Photo {
  id: string;
  parkId: string;
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

type ViewMode = "flat" | "byPark";
type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export function PhotoModerationTable({ photos }: PhotoModerationTableProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter by status then by park name search
  const filteredPhotos = photos
    .filter((p) => statusFilter === "ALL" || p.status === statusFilter)
    .filter((p) => p.park.name.toLowerCase().includes(search.toLowerCase()));

  // Group by park for the "By Park" view
  const byPark = filteredPhotos.reduce<Record<string, { parkName: string; slug: string; photos: Photo[] }>>(
    (acc, photo) => {
      if (!acc[photo.parkId]) {
        acc[photo.parkId] = { parkName: photo.park.name, slug: photo.park.slug, photos: [] };
      }
      acc[photo.parkId].photos.push(photo);
      return acc;
    },
    {},
  );
  const parkGroups = Object.entries(byPark).sort(([, a], [, b]) =>
    a.parkName.localeCompare(b.parkName),
  );

  const handleApprove = async (photoId: string) => {
    setProcessingId(photoId);
    try {
      const response = await fetch(`/api/admin/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to approve photo");
      }
    } catch (error) {
      console.error("Failed to approve photo:", error);
      alert("Failed to approve photo");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (photoId: string) => {
    setProcessingId(photoId);
    try {
      const response = await fetch(`/api/admin/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to reject photo");
      }
    } catch (error) {
      console.error("Failed to reject photo:", error);
      alert("Failed to reject photo");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    setProcessingId(photoId);
    try {
      const response = await fetch(`/api/admin/photos/${photoId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to delete photo");
      }
    } catch (error) {
      console.error("Failed to delete photo:", error);
      alert("Failed to delete photo");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":  return "bg-orange-100 text-orange-800";
      case "APPROVED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      default:         return "bg-gray-100 text-gray-800";
    }
  };

  // Render helpers (called as functions, not JSX components, to avoid remount on state change)
  const renderPhotoActions = (photo: Photo) => (
    <div className="flex gap-2 pt-2">
      {photo.status === "PENDING" && (
        <>
          <Button size="sm" onClick={() => handleApprove(photo.id)} disabled={processingId === photo.id} className="flex-1">
            <Check className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleReject(photo.id)} disabled={processingId === photo.id} className="flex-1">
            <X className="w-4 h-4 mr-1" /> Reject
          </Button>
        </>
      )}
      {photo.status === "REJECTED" && (
        <>
          <Button size="sm" onClick={() => handleApprove(photo.id)} disabled={processingId === photo.id} className="flex-1">
            <Check className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleDelete(photo.id)} disabled={processingId === photo.id}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
      {photo.status === "APPROVED" && (
        <Button size="sm" variant="destructive" onClick={() => handleDelete(photo.id)} disabled={processingId === photo.id} className="flex-1">
          <Trash2 className="w-4 h-4 mr-1" /> Delete
        </Button>
      )}
    </div>
  );

  const renderPhotoCard = (photo: Photo) => (
    <div key={photo.id} className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="relative h-48 bg-gray-100">
        <Image
          src={photo.url}
          alt={photo.caption || "Park photo"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-4 space-y-3">
        <div>
          <Link href={`/parks/${photo.park.slug}`} className="font-medium text-gray-900 hover:text-primary flex items-center gap-1">
            {photo.park.name}
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        {photo.caption && <p className="text-sm text-gray-600 line-clamp-2">{photo.caption}</p>}
        <div className="text-xs text-gray-500">Uploaded by: {photo.user?.name || "Unknown"}</div>
        <div className="text-xs text-gray-500">{new Date(photo.createdAt).toLocaleDateString()}</div>
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(photo.status)}`}>
          {photo.status}
        </span>
        {renderPhotoActions(photo)}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 space-y-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by park name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div className="flex flex-wrap items-center gap-4">
          {/* Status filter */}
          <div className="flex gap-2">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {s}
                {s !== "ALL" && (
                  <span className="ml-1.5 text-xs">
                    ({photos.filter((p) => p.status === s).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* View toggle */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setViewMode("flat")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "flat"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Photos
            </button>
            <button
              onClick={() => setViewMode("byPark")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "byPark"
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              By Park
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* ── Flat view ── */}
        {viewMode === "flat" && (
          filteredPhotos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No photos found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPhotos.map((photo) => renderPhotoCard(photo))}
            </div>
          )
        )}

        {/* ── By Park view ── */}
        {viewMode === "byPark" && (
          parkGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No photos found</div>
          ) : (
            <div className="space-y-8">
              {parkGroups.map(([parkId, group]) => {
                const hasApproved = group.photos.some((p) => p.status === "APPROVED");
                return (
                  <div key={parkId}>
                    <div className="flex items-center gap-3 mb-3">
                      <Link
                        href={`/parks/${group.slug}`}
                        className={`font-semibold text-gray-900 hover:text-primary flex items-center gap-1 ${
                          !hasApproved ? "text-orange-600" : ""
                        }`}
                      >
                        {group.parkName}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {group.photos.length} {group.photos.length === 1 ? "photo" : "photos"}
                      </span>
                      {!hasApproved && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          no approved photo
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.photos.map((photo) => renderPhotoCard(photo))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
