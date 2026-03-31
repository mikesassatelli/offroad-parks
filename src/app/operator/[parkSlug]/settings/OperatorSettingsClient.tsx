"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AmenitiesCheckboxGroup } from "@/components/forms/park-fields/AmenitiesCheckboxGroup";
import { CampingSection } from "@/components/forms/park-fields/CampingSection";
import { RequirementsSection } from "@/components/forms/park-fields/RequirementsSection";
import { TerrainCheckboxGroup } from "@/components/forms/park-fields/TerrainCheckboxGroup";
import { VehicleTypesCheckboxGroup } from "@/components/forms/park-fields/VehicleTypesCheckboxGroup";
import type { RequirementsValues } from "@/components/forms/park-fields/RequirementsSection";
import { CheckCircle, MapPin } from "lucide-react";

interface ParkData {
  name: string;
  website: string | null;
  phone: string | null;
  campingWebsite: string | null;
  campingPhone: string | null;
  notes: string | null;
  datesOpen: string | null;
  contactEmail: string | null;
  isFree: boolean | null;
  dayPassUSD: number | null;
  vehicleEntryFeeUSD: number | null;
  riderFeeUSD: number | null;
  membershipFeeUSD: number | null;
  milesOfTrails: number | null;
  acres: number | null;
  permitRequired: boolean | null;
  permitType: string | null;
  membershipRequired: boolean | null;
  maxVehicleWidthInches: number | null;
  flagsRequired: boolean | null;
  sparkArrestorRequired: boolean | null;
  noiseLimitDBA: number | null;
  terrain: string[];
  amenities: string[];
  camping: string[];
  vehicleTypes: string[];
}

interface OperatorSettingsClientProps {
  parkSlug: string;
  parkName: string;
}

export function OperatorSettingsClient({ parkSlug, parkName }: OperatorSettingsClientProps) {
  const [park, setPark] = useState<ParkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/operator/parks/${parkSlug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.park) setPark(data.park);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [parkSlug]);

  const handleChange = (field: keyof ParkData, value: unknown) => {
    setPark((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleRequirementsChange = (field: keyof RequirementsValues, value: RequirementsValues[keyof RequirementsValues]) => {
    if (field === "maxVehicleWidthInches" || field === "noiseLimitDBA") {
      handleChange(field, value ? parseInt(value as string) : null);
    } else {
      handleChange(field as keyof ParkData, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!park) return;

    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const res = await fetch(`/api/operator/parks/${parkSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(park),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || "Failed to save changes");
        return;
      }

      setSaveSuccess(true);
      if (data.park) setPark((prev) => ({ ...prev!, ...data.park }));
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!park) {
    return <p className="text-sm text-muted-foreground">Failed to load park data.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-6 h-6" />
          Park Details
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Edit listing details for {parkName}. Changes are applied immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" data-testid="settings-form">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Park Name</label>
              <input
                type="text"
                value={park.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Website</label>
                <input
                  type="url"
                  value={park.website || ""}
                  onChange={(e) => handleChange("website", e.target.value || null)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Phone</label>
                <input
                  type="tel"
                  value={park.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value || null)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Contact Email</label>
                <input
                  type="email"
                  value={park.contactEmail || ""}
                  onChange={(e) => handleChange("contactEmail", e.target.value || null)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  placeholder="info@park.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Dates Open</label>
                <input
                  type="text"
                  value={park.datesOpen || ""}
                  onChange={(e) => handleChange("datesOpen", e.target.value || null)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  placeholder="Year-round / May–October"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description / Notes</label>
              <textarea
                value={park.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value || null)}
                className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Terrain */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terrain Types</CardTitle>
          </CardHeader>
          <CardContent>
            <TerrainCheckboxGroup
              value={park.terrain}
              onChange={(v) => handleChange("terrain", v)}
            />
          </CardContent>
        </Card>

        {/* Amenities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Amenities</CardTitle>
          </CardHeader>
          <CardContent>
            <AmenitiesCheckboxGroup
              value={park.amenities}
              onChange={(v) => handleChange("amenities", v)}
            />
          </CardContent>
        </Card>

        {/* Camping */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Camping Options</CardTitle>
          </CardHeader>
          <CardContent>
            <CampingSection
              value={park.camping}
              onChange={(v) => handleChange("camping", v)}
              campingWebsite={park.campingWebsite || ""}
              onCampingWebsiteChange={(v) => handleChange("campingWebsite", v || null)}
              campingPhone={park.campingPhone || ""}
              onCampingPhoneChange={(v) => handleChange("campingPhone", v || null)}
            />
          </CardContent>
        </Card>

        {/* Vehicle Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allowed Vehicle Types</CardTitle>
          </CardHeader>
          <CardContent>
            <VehicleTypesCheckboxGroup
              value={park.vehicleTypes}
              onChange={(v) => handleChange("vehicleTypes", v)}
            />
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing (USD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                id="isFree"
                type="checkbox"
                checked={park.isFree ?? false}
                onChange={(e) => handleChange("isFree", e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="isFree" className="text-sm font-medium">Free admission</label>
            </div>
            {!park.isFree && (
              <div className="grid sm:grid-cols-2 gap-4">
                {(["dayPassUSD", "vehicleEntryFeeUSD", "riderFeeUSD", "membershipFeeUSD"] as const).map((field) => (
                  <div key={field}>
                    <label className="text-sm font-medium block mb-1 capitalize">
                      {field.replace("USD", " (USD)").replace(/([A-Z])/g, " $1").trim()}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={park[field] ?? ""}
                      onChange={(e) => handleChange(field, e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Physical Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Physical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Miles of Trails</label>
                <input
                  type="number"
                  min="0"
                  value={park.milesOfTrails ?? ""}
                  onChange={(e) => handleChange("milesOfTrails", e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Acres</label>
                <input
                  type="number"
                  min="0"
                  value={park.acres ?? ""}
                  onChange={(e) => handleChange("acres", e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requirements & Regulations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requirements & Regulations</CardTitle>
          </CardHeader>
          <CardContent>
            <RequirementsSection
              values={{
                permitRequired: park.permitRequired ?? false,
                permitType: park.permitType ?? "",
                membershipRequired: park.membershipRequired ?? false,
                flagsRequired: park.flagsRequired ?? false,
                sparkArrestorRequired: park.sparkArrestorRequired ?? false,
                maxVehicleWidthInches: park.maxVehicleWidthInches?.toString() ?? "",
                noiseLimitDBA: park.noiseLimitDBA?.toString() ?? "",
              }}
              onChange={handleRequirementsChange}
            />
          </CardContent>
        </Card>

        {/* Save */}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        {saveSuccess && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Changes saved successfully!
          </div>
        )}

        <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
