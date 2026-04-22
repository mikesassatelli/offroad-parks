"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SavedRoute } from "@/lib/types";
import { Loader2, Map as MapIcon, Pencil, Share2, Trash2 } from "lucide-react";
import { ShareRouteDialog } from "./ShareRouteDialog";

interface SavedRoutesListProps {
  initialRoutes: SavedRoute[];
}

function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m} min`;
}

function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function SavedRoutesList({ initialRoutes }: SavedRoutesListProps) {
  const router = useRouter();
  const [routes, setRoutes] = useState<SavedRoute[]>(initialRoutes);

  const [renameTarget, setRenameTarget] = useState<SavedRoute | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SavedRoute | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [shareTarget, setShareTarget] = useState<SavedRoute | null>(null);

  const handleToggleShare = async (
    target: SavedRoute,
    next: boolean,
  ): Promise<SavedRoute | null> => {
    try {
      const res = await fetch(`/api/routes/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: next }),
      });
      if (!res.ok) return null;
      const updated: SavedRoute = await res.json();
      setRoutes((current) =>
        current.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
      setShareTarget((current) =>
        current && current.id === updated.id ? { ...current, ...updated } : current,
      );
      return updated;
    } catch {
      return null;
    }
  };

  const handleOpen = (route: SavedRoute) => {
    router.push(`/?routeId=${route.id}`);
  };

  const openRename = (route: SavedRoute) => {
    setRenameTarget(route);
    setRenameValue(route.title);
    setRenameError(null);
  };

  const openDelete = (route: SavedRoute) => {
    setDeleteTarget(route);
    setDeleteError(null);
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError("Title cannot be empty");
      return;
    }
    setIsRenaming(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/routes/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        setRenameError("Failed to rename route");
        return;
      }
      const updated: SavedRoute = await res.json();
      setRoutes((current) =>
        current.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
      setRenameTarget(null);
    } catch {
      setRenameError("Failed to rename route");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/routes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setDeleteError("Failed to delete route");
        return;
      }
      setRoutes((current) => current.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError("Failed to delete route");
    } finally {
      setIsDeleting(false);
    }
  };

  if (routes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MapIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">
            You haven&apos;t saved any routes yet.
          </p>
          <Button
            onClick={() => router.push("/?view=map")}
            variant="default"
            size="sm"
          >
            Plan a route
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ul
        data-testid="saved-routes-list"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {routes.map((route) => {
          const duration = formatDuration(route.estimatedDurationMin);
          const stopCount = route.waypoints?.length ?? 0;
          return (
            <li key={route.id}>
              <Card className="h-full">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-lg font-semibold text-foreground truncate"
                      title={route.title}
                    >
                      {route.title}
                    </h2>
                    {route.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {route.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{stopCount} stops</span>
                      {route.totalDistanceMi != null && route.totalDistanceMi > 0 && (
                        <span>{route.totalDistanceMi} mi</span>
                      )}
                      {duration && <span>{duration}</span>}
                      <span>Updated {formatUpdated(route.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleOpen(route)}
                      aria-label={`Open ${route.title}`}
                    >
                      <MapIcon className="w-4 h-4 mr-1" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRename(route)}
                      aria-label={`Rename ${route.title}`}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShareTarget(route)}
                      aria-label={`Share ${route.title}`}
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDelete(route)}
                      aria-label={`Delete ${route.title}`}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {/* Rename dialog */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename route</DialogTitle>
            <DialogDescription>
              Give this route a new title.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleRename();
              }
            }}
            placeholder="Route title"
            aria-label="Route title"
            className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          {renameError && (
            <p className="text-xs text-destructive">{renameError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming}>
              {isRenaming ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <ShareRouteDialog
        route={shareTarget}
        onOpenChange={(open) => {
          if (!open) setShareTarget(null);
        }}
        onToggleShare={handleToggleShare}
      />

      {/* Delete confirm dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete route?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  This will permanently delete{" "}
                  <span className="font-medium text-foreground">
                    {deleteTarget.title}
                  </span>
                  . This action cannot be undone.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-xs text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
