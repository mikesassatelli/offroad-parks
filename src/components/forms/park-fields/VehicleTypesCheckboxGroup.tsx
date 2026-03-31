"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { ALL_VEHICLE_TYPES } from "@/lib/constants";

const VEHICLE_LABELS: Record<string, string> = {
  fullSize: "Full-Size",
  sxs: "SxS",
  atv: "ATV",
  motorcycle: "Motorcycle",
};

interface VehicleTypesCheckboxGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function VehicleTypesCheckboxGroup({ value, onChange }: VehicleTypesCheckboxGroupProps) {
  const toggle = (vehicleType: string) => {
    onChange(
      value.includes(vehicleType)
        ? value.filter((v) => v !== vehicleType)
        : [...value, vehicleType]
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ALL_VEHICLE_TYPES.map((vehicleType) => (
        <div key={vehicleType} className="flex items-center space-x-2">
          <Checkbox
            id={`vehicle-${vehicleType}`}
            checked={value.includes(vehicleType)}
            onCheckedChange={() => toggle(vehicleType)}
          />
          <label
            htmlFor={`vehicle-${vehicleType}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {VEHICLE_LABELS[vehicleType] ?? vehicleType}
          </label>
        </div>
      ))}
    </div>
  );
}
