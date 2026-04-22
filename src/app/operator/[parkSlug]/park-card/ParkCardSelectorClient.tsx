"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParkCard } from "@/components/parks/ParkCard";
import { ParkMapHero } from "@/components/parks/ParkMapHero";
import type { Park } from "@/lib/types";
import { resolveParkHeroImage } from "@/lib/park-hero";
import Image from "next/image";
import { CheckCircle } from "lucide-react";

type HeroSource = "AUTO" | "PHOTO" | "MAP";

interface ApprovedPhoto {
  id: string;
  url: string;
  caption: string | null;
}

interface Props {
  parkSlug: string;
  previewPark: Park;
  approvedPhotos: ApprovedPhoto[];
  initialHeroSource: HeroSource;
  initialHeroPhotoId: string | null;
}

export function ParkCardSelectorClient({
  parkSlug,
  previewPark,
  approvedPhotos,
  initialHeroSource,
  initialHeroPhotoId,
}: Props) {
  const [heroSource, setHeroSource] = useState<HeroSource>(initialHeroSource);
  const [heroPhotoId, setHeroPhotoId] = useState<string | null>(
    initialHeroPhotoId
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Compute the preview park shape live so the ParkCard reflects the current
  // selection without a server round-trip.
  const previewWithHero = useMemo<Park>(() => {
    const selectedPhoto = approvedPhotos.find((p) => p.id === heroPhotoId);
    const heroImage = resolveParkHeroImage({
      heroSource,
      heroPhotoId,
      heroPhoto: selectedPhoto
        ? { id: selectedPhoto.id, url: selectedPhoto.url, status: "APPROVED" }
        : null,
      photos: approvedPhotos.map((p) => ({
        id: p.id,
        url: p.url,
        status: "APPROVED" as const,
      })),
    });
    return { ...previewPark, heroImage: heroImage ?? undefined };
  }, [heroSource, heroPhotoId, approvedPhotos, previewPark]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/operator/parks/${parkSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heroSource,
          heroPhotoId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const canSave =
    !isSaving &&
    // Require a photo selection if source is PHOTO.
    (heroSource !== "PHOTO" || !!heroPhotoId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Park Card</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose which image is shown on your park&apos;s card across
          Offroad Parks.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm">
              <ParkCard
                park={previewWithHero}
                isFavorite={false}
                onToggleFavorite={() => {}}
              />
            </div>
          </CardContent>
        </Card>

        {/* Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hero image source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioRow
              name="heroSource"
              value="AUTO"
              checked={heroSource === "AUTO"}
              onChange={() => setHeroSource("AUTO")}
              label="Auto (recommended)"
              description="First approved photo, or the map image if you don't have any photos yet."
            />

            <RadioRow
              name="heroSource"
              value="MAP"
              checked={heroSource === "MAP"}
              onChange={() => setHeroSource("MAP")}
              label="Use map image"
              description="Always show the map thumbnail, even when approved photos exist."
            >
              <div className="mt-3 w-48 h-28 overflow-hidden rounded-md border border-border">
                <ParkMapHero park={previewPark} hideLegend />
              </div>
            </RadioRow>

            <RadioRow
              name="heroSource"
              value="PHOTO"
              checked={heroSource === "PHOTO"}
              onChange={() => setHeroSource("PHOTO")}
              label="Use an uploaded photo"
              description={
                approvedPhotos.length === 0
                  ? "No approved photos yet — upload one first."
                  : "Pick any approved photo below."
              }
            >
              {approvedPhotos.length > 0 && heroSource === "PHOTO" && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {approvedPhotos.map((photo) => {
                    const selected = photo.id === heroPhotoId;
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setHeroPhotoId(photo.id)}
                        className={`relative aspect-[4/3] overflow-hidden rounded-md border-2 transition ${
                          selected
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border hover:border-primary/40"
                        }`}
                        aria-pressed={selected}
                      >
                        <Image
                          src={photo.url}
                          alt={photo.caption ?? "Park photo"}
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                        {selected && (
                          <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </RadioRow>

            <div className="pt-4 border-t flex items-center gap-3">
              <Button onClick={handleSave} disabled={!canSave}>
                {isSaving ? "Saving…" : "Save"}
              </Button>
              {saveSuccess && (
                <span
                  className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1"
                  role="status"
                >
                  <CheckCircle className="w-4 h-4" /> Saved
                </span>
              )}
              {saveError && (
                <span className="text-sm text-red-600" role="alert">
                  {saveError}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RadioRow({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <label
      className={`block rounded-lg border p-4 cursor-pointer transition ${
        checked
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="font-medium">{label}</div>
          {description && (
            <div className="text-sm text-muted-foreground mt-0.5">
              {description}
            </div>
          )}
          {children}
        </div>
      </div>
    </label>
  );
}
