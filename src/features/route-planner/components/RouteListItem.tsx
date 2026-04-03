import { Button } from "@/components/ui/button";
import type { RouteWaypoint } from "@/lib/types";
import { PIN_COLORS } from "@/features/map/utils/markers";
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
  onSetColor?: (waypointId: string, color: string) => void;
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
  onSetColor,
}: RouteListItemProps) {
  const [showPicker, setShowPicker] = useState<"icon" | "color" | null>(null);

  const defaultColor = waypoint.type === "custom" ? "orange" : "blue";
  const activeColor = waypoint.color ?? defaultColor;
  const pinBg = PIN_COLORS[activeColor]?.bg ?? PIN_COLORS[defaultColor].bg;

  const badge =
    waypoint.type === "custom" ? (
      <button
        type="button"
        onClick={() => setShowPicker((v) => (v === "icon" ? null : "icon"))}
        title="Change icon"
        style={{ background: pinBg }}
        className="inline-flex items-center justify-center w-6 h-6 text-sm rounded-full flex-shrink-0 hover:opacity-80 transition cursor-pointer"
      >
        {waypoint.icon ?? "📍"}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setShowPicker((v) => (v === "color" ? null : "color"))}
        title="Change color"
        style={{ background: pinBg }}
        className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold text-white rounded-full flex-shrink-0 hover:opacity-80 transition cursor-pointer"
      >
        {index + 1}
      </button>
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
        {/* Badge is outside the link so clicking it doesn't navigate */}
        {badge}
        <div className="flex-1 min-w-0">
          {waypoint.type === "park" && waypoint.parkSlug ? (
            <Link href={`/parks/${waypoint.parkSlug}`} className="block min-w-0">
              <span className="text-sm font-medium truncate hover:text-primary block">{waypoint.label}</span>
            </Link>
          ) : (
            <span className="text-sm font-medium truncate block">{waypoint.label}</span>
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

      {/* Icon picker — custom waypoints only */}
      {showPicker === "icon" && onSetIcon && (
        <div className="px-2 pb-2 flex gap-1 flex-wrap">
          {CUSTOM_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSetIcon(waypoint.id, emoji);
                setShowPicker(null);
              }}
              className={`text-base px-1.5 py-0.5 rounded hover:bg-muted transition ${
                (waypoint.icon ?? "📍") === emoji ? "bg-muted ring-1 ring-primary" : ""
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Color picker — all waypoints */}
      {showPicker === "color" && onSetColor && (
        <div className="px-2 pb-2 flex gap-1.5 flex-wrap">
          {Object.entries(PIN_COLORS).map(([key, { bg, label }]) => (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => {
                onSetColor(waypoint.id, key);
                setShowPicker(null);
              }}
              style={{ background: bg }}
              className={`w-5 h-5 rounded-full hover:scale-110 transition ${
                activeColor === key ? "ring-2 ring-offset-1 ring-foreground" : ""
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
