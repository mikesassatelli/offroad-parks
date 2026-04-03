import { Button } from "@/components/ui/button";
import type { RouteWaypoint } from "@/lib/types";
import { GripVertical, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const CUSTOM_ICONS = ["📍", "🏠", "🏕️", "⛽", "🅿️", "🏪", "🔧", "🌄"];

interface RouteListItemProps {
  waypoint: RouteWaypoint;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDragLeave: () => void;
  onRemove: (waypointId: string) => void;
  onSetIcon?: (waypointId: string, icon: string) => void;
}

export function RouteListItem({
  waypoint,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragLeave,
  onRemove,
  onSetIcon,
}: RouteListItemProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);

  const iconBadge =
    waypoint.type === "custom" ? (
      <button
        type="button"
        onClick={() => setShowIconPicker((v) => !v)}
        title="Change icon"
        className="inline-flex items-center justify-center w-5 h-5 text-xs bg-orange-100 rounded-full flex-shrink-0 hover:bg-orange-200 transition cursor-pointer"
      >
        {waypoint.icon ?? "📍"}
      </button>
    ) : (
      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
        {index + 1}
      </span>
    );

  const labelContent = (
    <div className="flex items-center gap-2">
      {iconBadge}
      <span className="text-sm font-medium truncate hover:text-primary">
        {waypoint.label}
      </span>
    </div>
  );

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      className={`flex flex-col bg-muted/50 rounded-lg hover:bg-muted transition group ${
        isDragging ? "opacity-50" : ""
      } ${
        isDragOver ? "border-2 border-primary" : "border-2 border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 p-2">
        <GripVertical className="w-4 h-4 text-muted-foreground/60 flex-shrink-0 cursor-grab active:cursor-grabbing" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {waypoint.type === "park" && waypoint.parkSlug ? (
            <Link href={`/parks/${waypoint.parkSlug}`} className="flex-1 min-w-0">
              {labelContent}
            </Link>
          ) : (
            <div className="flex-1 min-w-0">{labelContent}</div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove"
          onClick={() => onRemove(waypoint.id)}
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      {showIconPicker && onSetIcon && (
        <div className="px-2 pb-2 flex gap-1 flex-wrap">
          {CUSTOM_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSetIcon(waypoint.id, emoji);
                setShowIconPicker(false);
              }}
              className={`text-base px-1.5 py-0.5 rounded hover:bg-orange-100 transition ${
                (waypoint.icon ?? "📍") === emoji ? "bg-orange-200" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
