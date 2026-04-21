"use client";

import {
  PhotoModerationTable as SharedPhotoModerationTable,
  type ModerationPhoto,
} from "@/components/moderation/PhotoModerationTable";

interface PhotoModerationTableProps {
  photos: ModerationPhoto[];
}

export function PhotoModerationTable({ photos }: PhotoModerationTableProps) {
  return (
    <SharedPhotoModerationTable photos={photos} apiBase="/api/admin/photos" />
  );
}
