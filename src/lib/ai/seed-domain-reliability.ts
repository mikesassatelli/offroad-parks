import { prisma } from "@/lib/prisma";

type SeedEntry = {
  domainPattern: string;
  defaultReliability: number;
  isBlocked: boolean;
  notes: string;
};

export const SEED_DOMAINS: SeedEntry[] = [
  {
    domainPattern: ".gov",
    defaultReliability: 85,
    isBlocked: false,
    notes: "Government sites — high trust",
  },
  {
    domainPattern: "riderplanet-usa.com",
    defaultReliability: 90,
    isBlocked: false,
    notes: "Established OHV directory — very reliable",
  },
  {
    domainPattern: "facebook.com",
    defaultReliability: 60,
    isBlocked: false,
    notes: "Facebook pages — moderate reliability",
  },
  {
    domainPattern: "fb.com",
    defaultReliability: 60,
    isBlocked: false,
    notes: "Facebook short domain",
  },
  {
    domainPattern: "recreation.gov",
    defaultReliability: 85,
    isBlocked: false,
    notes: "Federal recreation portal",
  },
  {
    domainPattern: "alltrails.com",
    defaultReliability: 70,
    isBlocked: false,
    notes: "Trail review site",
  },
  {
    domainPattern: "tripadvisor.com",
    defaultReliability: 65,
    isBlocked: false,
    notes: "Travel review site",
  },
  {
    domainPattern: "yelp.com",
    defaultReliability: 60,
    isBlocked: false,
    notes: "Business review site",
  },
];

/**
 * Seed the DomainReliability table with initial entries.
 * Uses upsert to skip entries that already exist (matched by domainPattern).
 */
export async function seedDomainReliability(): Promise<void> {
  for (const entry of SEED_DOMAINS) {
    await prisma.domainReliability.upsert({
      where: { domainPattern: entry.domainPattern },
      update: {},
      create: {
        domainPattern: entry.domainPattern,
        defaultReliability: entry.defaultReliability,
        isBlocked: entry.isBlocked,
        notes: entry.notes,
      },
    });
  }
}
