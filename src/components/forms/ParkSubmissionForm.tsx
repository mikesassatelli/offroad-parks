"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ALL_TERRAIN_TYPES, ALL_AMENITIES } from "@/lib/constants";
import { US_STATES } from "@/lib/constants";
import { Loader2 } from "lucide-react";

interface ParkSubmissionFormProps {
  isAdminForm?: boolean;
}

const DIFFICULTY_LEVELS = ["easy", "moderate", "difficult", "extreme"];

export function ParkSubmissionForm({
  isAdminForm = false,
}: ParkSubmissionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    city: "",
    state: "",
    latitude: "",
    longitude: "",
    website: "",
    phone: "",
    dayPassUSD: "",
    milesOfTrails: "",
    acres: "",
    notes: "",
    submitterName: "",
    terrain: [] as string[],
    difficulty: [] as string[],
    amenities: [] as string[],
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name if not admin
    if (name === "name" && !isAdminForm) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleCheckboxChange = (
    field: "terrain" | "difficulty" | "amenities",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/parks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude
            ? parseFloat(formData.longitude)
            : null,
          dayPassUSD: formData.dayPassUSD
            ? parseFloat(formData.dayPassUSD)
            : null,
          milesOfTrails: formData.milesOfTrails
            ? parseInt(formData.milesOfTrails)
            : null,
          acres: formData.acres ? parseInt(formData.acres) : null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          isAdminForm
            ? "Park created successfully!"
            : "Park submitted for review! An admin will review it soon.",
        );
        if (isAdminForm) {
          router.push(`/admin/parks?highlight=${result.park.id}`);
        } else {
          router.push("/");
        }
      } else {
        const error = await response.json();
        alert(`Failed to submit: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit park. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div>
          <Label htmlFor="name">Park Name *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        {isAdminForm && (
          <div>
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              required
            />
          </div>
        )}

        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label htmlFor="state">State *</Label>
          <Select
            value={formData.state}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, state: value }))
            }
          >
            <SelectTrigger id="state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            value={formData.latitude}
            onChange={handleInputChange}
            placeholder="e.g., 37.7749"
          />
        </div>

        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            value={formData.longitude}
            onChange={handleInputChange}
            placeholder="e.g., -122.4194"
          />
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            type="url"
            value={formData.website}
            onChange={handleInputChange}
            placeholder="https://..."
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <Label htmlFor="dayPassUSD">Day Pass Price (USD)</Label>
          <Input
            id="dayPassUSD"
            name="dayPassUSD"
            type="number"
            step="0.01"
            value={formData.dayPassUSD}
            onChange={handleInputChange}
            placeholder="25.00"
          />
        </div>

        <div>
          <Label htmlFor="milesOfTrails">Miles of Trails</Label>
          <Input
            id="milesOfTrails"
            name="milesOfTrails"
            type="number"
            value={formData.milesOfTrails}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <Label htmlFor="acres">Acres</Label>
          <Input
            id="acres"
            name="acres"
            type="number"
            value={formData.acres}
            onChange={handleInputChange}
          />
        </div>

        {!isAdminForm && (
          <div>
            <Label htmlFor="submitterName">Your Name (optional)</Label>
            <Input
              id="submitterName"
              name="submitterName"
              value={formData.submitterName}
              onChange={handleInputChange}
            />
          </div>
        )}
      </div>

      {/* Terrain Types */}
      <div>
        <Label className="mb-3 block">Terrain Types *</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ALL_TERRAIN_TYPES.map((terrain) => (
            <div key={terrain} className="flex items-center space-x-2">
              <Checkbox
                id={`terrain-${terrain}`}
                checked={formData.terrain.includes(terrain)}
                onCheckedChange={() => handleCheckboxChange("terrain", terrain)}
              />
              <label
                htmlFor={`terrain-${terrain}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
              >
                {terrain}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty Levels */}
      <div>
        <Label className="mb-3 block">Difficulty Levels *</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DIFFICULTY_LEVELS.map((difficulty) => (
            <div key={difficulty} className="flex items-center space-x-2">
              <Checkbox
                id={`difficulty-${difficulty}`}
                checked={formData.difficulty.includes(difficulty)}
                onCheckedChange={() =>
                  handleCheckboxChange("difficulty", difficulty)
                }
              />
              <label
                htmlFor={`difficulty-${difficulty}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
              >
                {difficulty}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <Label className="mb-3 block">Amenities</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ALL_AMENITIES.map((amenity) => (
            <div key={amenity} className="flex items-center space-x-2">
              <Checkbox
                id={`amenity-${amenity}`}
                checked={formData.amenities.includes(amenity)}
                onCheckedChange={() => handleCheckboxChange("amenities", amenity)}
              />
              <label
                htmlFor={`amenity-${amenity}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
              >
                {amenity}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={4}
          placeholder="Any additional information about the park..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : isAdminForm ? (
            "Create Park"
          ) : (
            "Submit for Review"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
