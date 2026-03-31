"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RequirementsValues {
  permitRequired: boolean;
  permitType: string;
  membershipRequired: boolean;
  flagsRequired: boolean;
  sparkArrestorRequired: boolean;
  maxVehicleWidthInches: string;
  noiseLimitDBA: string;
}

interface RequirementsSectionProps {
  values: RequirementsValues;
  onChange: <K extends keyof RequirementsValues>(field: K, value: RequirementsValues[K]) => void;
}

export function RequirementsSection({ values, onChange }: RequirementsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="permitRequired"
          checked={values.permitRequired}
          onCheckedChange={(checked) => onChange("permitRequired", !!checked)}
        />
        <label
          htmlFor="permitRequired"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Permit Required
        </label>
      </div>

      {values.permitRequired && (
        <div>
          <Label htmlFor="permitType">Permit Type</Label>
          <Input
            id="permitType"
            value={values.permitType}
            onChange={(e) => onChange("permitType", e.target.value)}
            placeholder="e.g., OHV sticker, Day use permit"
            maxLength={100}
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="membershipRequired"
          checked={values.membershipRequired}
          onCheckedChange={(checked) => onChange("membershipRequired", !!checked)}
        />
        <label
          htmlFor="membershipRequired"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Membership Required
        </label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="flagsRequired"
          checked={values.flagsRequired}
          onCheckedChange={(checked) => onChange("flagsRequired", !!checked)}
        />
        <label
          htmlFor="flagsRequired"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Whip Flags Required
        </label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="sparkArrestorRequired"
          checked={values.sparkArrestorRequired}
          onCheckedChange={(checked) => onChange("sparkArrestorRequired", !!checked)}
        />
        <label
          htmlFor="sparkArrestorRequired"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Spark Arrestor Required
        </label>
      </div>

      <div>
        <Label htmlFor="maxVehicleWidthInches">Max Vehicle Width (inches)</Label>
        <Input
          id="maxVehicleWidthInches"
          type="number"
          min="0"
          max="200"
          value={values.maxVehicleWidthInches}
          onChange={(e) => onChange("maxVehicleWidthInches", e.target.value)}
          placeholder="e.g., 65"
        />
      </div>

      <div>
        <Label htmlFor="noiseLimitDBA">Noise Limit (dBA)</Label>
        <Input
          id="noiseLimitDBA"
          type="number"
          min="0"
          max="150"
          value={values.noiseLimitDBA}
          onChange={(e) => onChange("noiseLimitDBA", e.target.value)}
          placeholder="e.g., 96"
        />
      </div>
    </div>
  );
}
