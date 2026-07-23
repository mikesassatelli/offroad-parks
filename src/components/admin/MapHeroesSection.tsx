import { prisma } from "@/lib/prisma";
import { MapHeroBackfillRunner } from "@/components/admin/MapHeroBackfillRunner";
import { Image as ImageIcon } from "lucide-react";

/**
 * Map-hero backfill coverage + runner, as a section for the Photos tab.
 * Generates a Mapbox static thumbnail for each park without one; new parks are
 * covered automatically at creation, so this is only a catch-up tool.
 */
export async function MapHeroesSection() {
  const [totalParks, withHero, withoutCoords, needingBackfill] =
    await Promise.all([
      prisma.park.count(),
      prisma.park.count({ where: { mapHeroUrl: { not: null } } }),
      prisma.park.count({
        where: {
          latitude: null,
          OR: [{ address: null }, { address: { latitude: null } }],
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
    <section className="mt-8 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Map Hero Coverage
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Generates a Mapbox static-image thumbnail for each park without one.
          New parks are covered automatically at creation — this is only needed
          to catch up existing parks.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
    </section>
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
    success:
      "text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/40",
    warn: "text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/40",
    muted: "text-muted-foreground border-border",
  } as const;
  return (
    <div className={`bg-background rounded-lg border p-3 ${toneClasses[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
