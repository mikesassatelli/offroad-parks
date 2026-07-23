/**
 * Seed script: populate the DomainReliability table with sensible starting
 * defaults (.gov=85, riderplanet-usa.com=90, recreation.gov=85, alltrails=70,
 * tripadvisor=65, facebook/fb/yelp=60).
 *
 * Usage:
 *   npx tsx prisma/seed-domain-reliability.ts
 *
 * Idempotent: create-only (existing rows are left untouched), so it's safe to
 * run repeatedly and it will never overwrite an admin-edited or auto-tuned
 * score. Targets whatever DB the environment's DATABASE_URL points at.
 */

import { seedDomainReliability } from "../src/lib/ai/seed-domain-reliability";
import { prisma } from "../src/lib/prisma";

async function main() {
  await seedDomainReliability();
  const total = await prisma.domainReliability.count();
  console.log(`✓ Domain reliability seeded. ${total} row(s) total.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
