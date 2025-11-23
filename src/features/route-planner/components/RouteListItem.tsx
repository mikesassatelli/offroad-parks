import { Button } from "@/components/ui/button";
import type { Park } from "@/lib/types";
import { GripVertical, X } from "lucide-react";
import Link from "next/link";

interface RouteListItemProps {
  park: Park;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDragLeave: () => void;
  onRemovePark: (parkId: string) => void;
}

export function RouteListItem({
  park,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDragLeave,
  onRemovePark,
}: RouteListItemProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      className={`flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition group ${
        isDragging ? "opacity-50" : ""
      } ${
        isDragOver ? "border-2 border-blue-500" : "border-2 border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />
        <Link href={`/parks/${park.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
              {index + 1}
            </span>
            <span className="text-sm font-medium truncate hover:text-primary">
              {park.name}
            </span>
          </div>
          <div className="text-xs text-gray-500 ml-7">
            {park.address.city ? `${park.address.city}, ` : ""}
            {park.address.state}
          </div>
        </Link>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemovePark(park.id)}
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
