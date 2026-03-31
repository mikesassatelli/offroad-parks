"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { ALL_AMENITIES } from "@/lib/constants";
import { formatAmenity } from "@/lib/formatting";
import type { Amenity } from "@/lib/types";

interface AmenitiesCheckboxGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function AmenitiesCheckboxGroup({ value, onChange }: AmenitiesCheckboxGroupProps) {
  const toggle = (amenity: string) => {
    onChange(
      value.includes(amenity)
        ? value.filter((v) => v !== amenity)
        : [...value, amenity]
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {ALL_AMENITIES.map((amenity) => (
        <div key={amenity} className="flex items-center space-x-2">
          <Checkbox
            id={`amenity-${amenity}`}
            checked={value.includes(amenity)}
            onCheckedChange={() => toggle(amenity)}
          />
          <label
            htmlFor={`amenity-${amenity}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {formatAmenity(amenity as Amenity)}
          </label>
        </div>
      ))}
    </div>
  );
}
