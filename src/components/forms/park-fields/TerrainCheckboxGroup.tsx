"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { ALL_TERRAIN_TYPES } from "@/lib/constants";
import { formatTerrain } from "@/lib/formatting";
import type { Terrain } from "@/lib/types";

interface TerrainCheckboxGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TerrainCheckboxGroup({ value, onChange }: TerrainCheckboxGroupProps) {
  const toggle = (terrain: string) => {
    onChange(
      value.includes(terrain)
        ? value.filter((v) => v !== terrain)
        : [...value, terrain]
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {ALL_TERRAIN_TYPES.map((terrain) => (
        <div key={terrain} className="flex items-center space-x-2">
          <Checkbox
            id={`terrain-${terrain}`}
            checked={value.includes(terrain)}
            onCheckedChange={() => toggle(terrain)}
          />
          <label
            htmlFor={`terrain-${terrain}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {formatTerrain(terrain as Terrain)}
          </label>
        </div>
      ))}
    </div>
  );
}
