import { Card, CardContent } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { useState } from "react";
import { RouteListEmpty } from "./components/RouteListEmpty";
import { RouteListHeader } from "./components/RouteListHeader";
import { RouteListItem } from "./components/RouteListItem";

interface RouteListProps {
  routeParks: Park[];
  onRemovePark: (parkId: string) => void;
  onClearRoute: () => void;
  onReorderRoute: (fromIndex: number, toIndex: number) => void;
  totalDistance: number;
}

export function RouteList({
  routeParks,
  onRemovePark,
  onClearRoute,
  onReorderRoute,
  totalDistance,
}: RouteListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      onReorderRoute(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  if (routeParks.length === 0) {
    return <RouteListEmpty />;
  }

  return (
    <Card className="h-full">
      <RouteListHeader
        totalDistance={totalDistance}
        onClearRoute={onClearRoute}
      />
      <CardContent className="space-y-2">
        {routeParks.map((park, index) => (
          <RouteListItem
            key={park.id}
            park={park}
            index={index}
            isDragging={draggedIndex === index}
            isDragOver={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
            onRemovePark={onRemovePark}
          />
        ))}
      </CardContent>
    </Card>
  );
}
