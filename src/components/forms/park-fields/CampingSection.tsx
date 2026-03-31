"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALL_CAMPING_TYPES } from "@/lib/constants";
import { formatCamping } from "@/lib/formatting";
import type { Camping } from "@/lib/types";

interface CampingSectionProps {
  value: string[];
  onChange: (value: string[]) => void;
  campingWebsite: string;
  onCampingWebsiteChange: (value: string) => void;
  campingPhone: string;
  onCampingPhoneChange: (value: string) => void;
}

export function CampingSection({
  value,
  onChange,
  campingWebsite,
  onCampingWebsiteChange,
  campingPhone,
  onCampingPhoneChange,
}: CampingSectionProps) {
  const toggle = (camping: string) => {
    onChange(
      value.includes(camping)
        ? value.filter((v) => v !== camping)
        : [...value, camping]
    );
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ALL_CAMPING_TYPES.map((camping) => (
          <div key={camping} className="flex items-center space-x-2">
            <Checkbox
              id={`camping-${camping}`}
              checked={value.includes(camping)}
              onCheckedChange={() => toggle(camping)}
            />
            <label
              htmlFor={`camping-${camping}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {formatCamping(camping as Camping)}
            </label>
          </div>
        ))}
      </div>

      {value.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <Label className="mb-3 block text-sm text-muted-foreground">
            Camping Reservations (Optional)
          </Label>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campingWebsite" className="text-sm">
                Camping Website
              </Label>
              <Input
                id="campingWebsite"
                name="campingWebsite"
                type="url"
                value={campingWebsite}
                onChange={(e) => onCampingWebsiteChange(e.target.value)}
                placeholder="https://reservations..."
              />
            </div>
            <div>
              <Label htmlFor="campingPhone" className="text-sm">
                Camping Phone
              </Label>
              <Input
                id="campingPhone"
                name="campingPhone"
                type="tel"
                value={campingPhone}
                onChange={(e) => onCampingPhoneChange(e.target.value.replace(/\D/g, ""))}
                placeholder="5551234567"
                maxLength={15}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
