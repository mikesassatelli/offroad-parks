/**
 * Admin backfill page for park map heroes (OP-90).
 *
 * Shows coverage stats + a button that processes batches until every
 * park with coordinates has a `mapHeroUrl`. One-time-per-park operation;
 * generation happens automatically on future park creation.
 */
import { prisma } from "@/lib/prisma";
import { MapHeroBackfillRunner } from "@/components/admin/MapHeroBackfillRunner";
import { Image as ImageIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminMapHeroesPage() {
  const [totalParks, withHero, withoutCoords, needingBackfill] = await Promise.all([
    prisma.park.count(),
    prisma.park.count({ where: { mapHeroUrl: { not: null } } }),
    prisma.park.count({
      where: {
        latitude: null,
        OR: [
          { address: null },
          { address: { latitude: null } },
        ],
      },
    }),
    prisma.park.count({
      where: {
        mapHeroUrl: null,
        OR: [
          { latitude: { not: null } },
          { address: { latitude: { not: null } } },
        ],
      },
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <ImageIcon className="w-8 h-8" />
          Map Hero Backfill
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          Generates a Mapbox static-image thumbnail for each park without one
          and stores it in Vercel Blob. New parks are covered automatically at
          creation time — this page is only needed to catch up existing parks.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total parks" value={totalParks} tone="neutral" />
        <StatCard label="With map hero" value={withHero} tone="success" />
        <StatCard label="Awaiting backfill" value={needingBackfill} tone="warn" />
        <StatCard
          label="Without coords"
          value={withoutCoords}
          tone="muted"
          hint="Can't generate without lat/lng"
        />
      </div>

      <MapHeroBackfillRunner initialRemaining={needingBackfill} />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "warn" | "muted";
  hint?: string;
}) {
  const toneClasses = {
    neutral: "text-foreground border-border",
    success: "text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/40",
    warn: "text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/40",
    muted: "text-muted-foreground border-border",
  } as const;
  return (
    <div className={`bg-card rounded-lg border p-4 ${toneClasses[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
