"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Trash2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string | null;
  } | null;
  userId: string | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
  currentUserId?: string;
  isAdmin?: boolean;
}

export function PhotoGallery({ photos, currentUserId, isAdmin }: PhotoGalleryProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No photos yet. Be the first to upload one!</p>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const goToPrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length);
  };

  const goToNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % photos.length);
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        closeLightbox();
        router.refresh();
      } else {
        alert("Failed to delete photo");
      }
    } catch (error) {
      console.error("Failed to delete photo:", error);
      alert("Failed to delete photo");
    } finally {
      setIsDeleting(false);
    }
  };

  const canDeletePhoto = (photo: Photo) => {
    return isAdmin || photo.userId === currentUserId;
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg border border-border hover:border-primary transition-colors"
            onClick={() => openLightbox(index)}
          >
            <Image
              src={photo.url}
              alt={photo.caption || "Park photo"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end">
              <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-full">
                {photo.user?.name && (
                  <div className="flex items-center gap-1 text-xs">
                    <UserIcon className="w-3 h-3" />
                    <span className="truncate">{photo.user.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10"
          >
            <ChevronLeft className="w-12 h-12" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10"
          >
            <ChevronRight className="w-12 h-12" />
          </button>

          <div className="max-w-6xl w-full flex flex-col items-center gap-4">
            <div className="relative w-full" style={{ height: "70vh" }}>
              <Image
                src={photos[selectedIndex].url}
                alt={photos[selectedIndex].caption || "Park photo"}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            </div>

            <div className="bg-black/50 p-4 mt-4 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {photos[selectedIndex].caption && (
                    <p className="text-white text-lg mb-2">
                      {photos[selectedIndex].caption}
                    </p>
                  )}
                  {photos[selectedIndex].user?.name && (
                    <p className="text-gray-300 text-sm flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      {photos[selectedIndex].user.name}
                    </p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(photos[selectedIndex].createdAt).toLocaleDateString()}
                  </p>
                </div>

                {canDeletePhoto(photos[selectedIndex]) && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(photos[selectedIndex].id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            </div>

            <div className="text-center text-white/60 text-sm mt-2">
              {selectedIndex + 1} / {photos.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
