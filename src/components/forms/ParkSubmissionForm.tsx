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
import {
  ALL_AMENITIES,
  ALL_TERRAIN_TYPES,
  ALL_VEHICLE_TYPES,
} from "@/lib/constants";
import { US_STATES } from "@/lib/constants";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";

interface FormData {
  name: string;
  slug: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  website: string;
  phone: string;
  dayPassUSD: string;
  milesOfTrails: string;
  acres: string;
  notes: string;
  submitterName: string;
  terrain: string[];
  difficulty: string[];
  amenities: string[];
  vehicleTypes: string[];
}

interface ParkSubmissionFormProps {
  isAdminForm?: boolean;
  initialData?: FormData;
  parkId?: string;
  existingPhotoCount?: number;
}

const DIFFICULTY_LEVELS = ["easy", "moderate", "difficult", "extreme"];

export function ParkSubmissionForm({
  isAdminForm = false,
  initialData,
  parkId,
  existingPhotoCount = 0,
}: ParkSubmissionFormProps) {
  const router = useRouter();
  const isEditMode = !!parkId;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState<FormData>(
    initialData || {
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
      terrain: [],
      difficulty: [],
      amenities: [],
      vehicleTypes: [],
    },
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    // Sanitize phone number - strip all non-numeric characters
    if (name === "phone") {
      const sanitized = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name if not admin and not in edit mode
    if (name === "name" && !isAdminForm && !isEditMode) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleCheckboxChange = (
    field: "terrain" | "difficulty" | "amenities" | "vehicleTypes",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles = files.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        alert(
          `${file.name}: Invalid file type. Only JPEG, PNG, and WebP allowed.`,
        );
        return false;
      }
      if (file.size > maxSize) {
        alert(`${file.name}: File too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    if (photos.length + validFiles.length > 5) {
      alert("Maximum 5 photos allowed");
      return;
    }

    setPhotos((prev) => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = isEditMode
        ? `/api/admin/parks/${parkId}`
        : "/api/parks/submit";
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
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
        const parkSlug = isEditMode ? formData.slug : result.park.slug;
        const resultParkId = isEditMode ? parkId : result.park.id;

        // Upload photos if any (only in create mode)
        if (!isEditMode && photos.length > 0 && parkSlug) {
          for (const photo of photos) {
            const photoFormData = new FormData();
            photoFormData.append("file", photo);
            photoFormData.append("caption", "");

            try {
              await fetch(`/api/parks/${parkSlug}/photos`, {
                method: "POST",
                body: photoFormData,
              });
            } catch (photoError) {
              /* v8 ignore next - Photo upload error logging only */
              console.error("Failed to upload photo:", photoError);
            }
          }
        }

        alert(
          isEditMode
            ? "Park updated successfully!"
            : isAdminForm
              ? "Park created successfully!"
              : "Park submitted for review! An admin will review it soon.",
        );
        if (isAdminForm) {
          router.push(`/admin/parks?highlight=${resultParkId}`);
        } else {
          router.push("/");
        }
      } else {
        const error = await response.json();
        alert(
          `Failed to ${isEditMode ? "update" : "submit"}: ${error.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      /* v8 ignore next - Network error logging only */
      console.error("Submission error:", error);
      alert(`Failed to ${isEditMode ? "update" : "submit"} park. Please try again.`);
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
            maxLength={100}
          />
        </div>

        {isAdminForm && (
          <div>
            <Label htmlFor="slug">
              Slug * {isEditMode && "(read-only)"}
            </Label>
            <Input
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              required
              disabled={isEditMode}
              className={isEditMode ? "bg-muted cursor-not-allowed" : ""}
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
            maxLength={50}
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
            placeholder="5551234567"
            maxLength={15}
          />
        </div>

        <div>
          <Label htmlFor="dayPassUSD">Day Pass Price (USD)</Label>
          <Input
            id="dayPassUSD"
            name="dayPassUSD"
            type="number"
            step="0.01"
            min="0"
            max="9999.99"
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
            min="0"
            max="99999"
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
            min="0"
            max="9999999"
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
              maxLength={100}
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
                onCheckedChange={() =>
                  handleCheckboxChange("amenities", amenity)
                }
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

      {/* Vehicle Types */}
      <div>
        <Label className="mb-3 block">Allowed Vehicle Types</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_VEHICLE_TYPES.map((vehicleType) => (
            <div key={vehicleType} className="flex items-center space-x-2">
              <Checkbox
                id={`vehicle-${vehicleType}`}
                checked={formData.vehicleTypes.includes(vehicleType)}
                onCheckedChange={() =>
                  handleCheckboxChange("vehicleTypes", vehicleType)
                }
              />
              <label
                htmlFor={`vehicle-${vehicleType}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
              >
                {vehicleType === "fullSize"
                  ? "Full-Size"
                  : vehicleType === "sxs"
                    ? "SxS"
                    : vehicleType === "atv"
                      ? "ATV"
                      : "Motorcycle"}
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
          maxLength={2000}
        />
      </div>

      {/* Photos */}
      {!isEditMode && (
        <div>
          <Label className="mb-3 block">Photos (Optional, max 5)</Label>
          <div className="space-y-4">
            {/* File input */}
            {photos.length < 5 && (
              <div>
                <label
                  htmlFor="photos"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload photos
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, or WebP (max 5MB each)
                    </p>
                  </div>
                  <input
                    id="photos"
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    multiple
                  />
                </label>
              </div>
            )}

            {/* Photo previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground p-1 rounded-full hover:bg-destructive/90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existing photos indicator */}
      {isEditMode && existingPhotoCount > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            This park has {existingPhotoCount} existing photo
            {existingPhotoCount !== 1 ? "s" : ""}. Photo management is not
            available in edit mode.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isEditMode ? "Updating..." : "Submitting..."}
            </>
          ) : isEditMode ? (
            "Update Park"
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
