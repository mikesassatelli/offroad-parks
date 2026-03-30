/**
 * Seed script: generate fake reviews for dev testing.
 *
 * Usage:
 *   npx tsx prisma/seed-reviews.ts
 *   npx tsx prisma/seed-reviews.ts --wipe   (clears all existing reviews first)
 *
 * Targets the DB from .env (dev Neon branch).
 * Each approved park gets 3–7 reviews with varied ratings and recommendedDuration
 * values so averageRecommendedStay is exercised with real distribution.
 */

import { PrismaClient, type RecommendedDuration, type VehicleType, type VisitCondition } from "@prisma/client";
import { recalculateParkRatings } from "../src/lib/review-utils";

const prisma = new PrismaClient();

// ── Fake review content pools ─────────────────────────────────────────────────

const TITLES = [
  "Great day out",
  "Underrated gem",
  "Solid trail system",
  "Fun for the whole group",
  "Came back again — worth it",
  "Better than expected",
  "Not for beginners",
  "Challenging but rewarding",
  "Perfect for a quick ride",
  "Weekend warrior approved",
  "Needs more signage",
  "Excellent variety of terrain",
  "A bit muddy but fun",
  "Would bring the family again",
  "Hidden gem in the midwest",
];

const BODIES = [
  "Trails were well-maintained and clearly marked. We hit several technical sections that kept things interesting. Facilities were clean and the staff was helpful.",
  "Lots of variety — some easy loops for the newer riders in our group and plenty of harder lines for those of us who wanted a challenge. Would come back.",
  "Conditions were great when we visited. The mud pits were actually a highlight. Just be aware the main lot fills up fast on weekends.",
  "Shorter ride than we expected but the terrain was diverse enough that we kept lapping. Good for a half-day trip if you're in the area.",
  "Came out here for the first time and was impressed. The trail map could be better but locals on the trail were friendly and pointed us in the right direction.",
  "Decent park overall. The technical rock section on the east loop is a highlight but can get backed up. Recommend arriving early.",
  "Brought my SXS for the first time here and had a blast. Wide enough trails but still plenty of tight wooded sections to keep it fun.",
  "Great facilities — real bathrooms, decent food truck on weekends. Worth the drive.",
  "Trail markings were a bit confusing on the north loop but otherwise a solid park. Will return.",
  "Our group of 8 had a great time. Enough trail miles that we never felt crowded. Campsite was a bit basic but functional.",
];

const DURATIONS: RecommendedDuration[] = ["quickRide", "halfDay", "fullDay", "overnight"];
const VEHICLE_TYPES: VehicleType[] = ["motorcycle", "atv", "sxs", "fullSize"];
const CONDITIONS: VisitCondition[] = ["dry", "wet", "mixed"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Weighted random duration — biased so most parks lean towards halfDay/fullDay
 * but still have a realistic spread for testing the ceiling calculation.
 */
function weightedDuration(): RecommendedDuration {
  const r = Math.random();
  if (r < 0.15) return "quickRide";   // 15%
  if (r < 0.40) return "halfDay";     // 25%
  if (r < 0.75) return "fullDay";     // 35%
  return "overnight";                  // 25%
}

/**
 * Generate a plausible visit date within the last 18 months.
 */
function recentDate(): Date {
  const now = Date.now();
  const eighteenMonthsAgo = now - 18 * 30 * 24 * 60 * 60 * 1000;
  return new Date(eighteenMonthsAgo + Math.random() * (now - eighteenMonthsAgo));
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Fake reviewer names — seed users created only in dev
const SEED_REVIEWERS = [
  { name: "Alex Trailhead", email: "seed+alex@dev.local" },
  { name: "Jordan Mudpits", email: "seed+jordan@dev.local" },
  { name: "Casey Rockline", email: "seed+casey@dev.local" },
  { name: "Riley Dustcloud", email: "seed+riley@dev.local" },
  { name: "Morgan Wheelbase", email: "seed+morgan@dev.local" },
  { name: "Taylor Highclear", email: "seed+taylor@dev.local" },
  { name: "Drew Sandwash", email: "seed+drew@dev.local" },
];

async function upsertSeedReviewers() {
  const users = [];
  for (const r of SEED_REVIEWERS) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: {},
      create: { name: r.name, email: r.email },
    });
    users.push(user);
  }
  return users;
}

async function main() {
  const wipe = process.argv.includes("--wipe");

  if (wipe) {
    const { count } = await prisma.parkReview.deleteMany({});
    console.log(`Wiped ${count} existing reviews.`);
  }

  // Ensure seed reviewer accounts exist
  const reviewers = await upsertSeedReviewers();
  console.log(`Using ${reviewers.length} seed reviewer accounts.`);

  const parks = await prisma.park.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true },
  });
  console.log(`Found ${parks.length} approved parks. Generating reviews…\n`);

  let totalCreated = 0;

  for (const park of parks) {
    // Shuffle reviewers and pick a random subset (3–min(7, reviewerCount))
    const shuffled = [...reviewers].sort(() => Math.random() - 0.5);
    const reviewCount = randInt(3, Math.min(7, shuffled.length));
    const selectedReviewers = shuffled.slice(0, reviewCount);

    for (const reviewer of selectedReviewers) {
      // Skip if this reviewer already has a review for this park (re-run safety)
      const existing = await prisma.parkReview.findUnique({
        where: { userId_parkId: { userId: reviewer.id, parkId: park.id } },
      });
      if (existing) continue;

      await prisma.parkReview.create({
        data: {
          parkId: park.id,
          userId: reviewer.id,
          overallRating: randInt(3, 5),
          terrainRating: randInt(2, 5),
          facilitiesRating: randInt(2, 5),
          difficultyRating: randInt(2, 5),
          title: pick(TITLES),
          body: pick(BODIES),
          visitDate: recentDate(),
          vehicleType: Math.random() > 0.2 ? pick(VEHICLE_TYPES) : null,
          visitCondition: Math.random() > 0.2 ? pick(CONDITIONS) : null,
          recommendedDuration: Math.random() > 0.1 ? weightedDuration() : null,
          status: "APPROVED",
        },
      });
      totalCreated++;
    }

    // Recalculate park aggregates (ratings + averageRecommendedStay)
    await recalculateParkRatings(park.id);
    console.log(`  ✓ ${park.name} — ${reviewCount} reviews`);
  }

  console.log(`\nDone. Created ${totalCreated} reviews across ${parks.length} parks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
