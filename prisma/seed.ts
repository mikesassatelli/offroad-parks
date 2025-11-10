import { PrismaClient, Terrain, Difficulty, Amenity } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed the existing parks as APPROVED
  const parks = [
    {
      name: "Cobb Ridge Off-Road Park",
      slug: "cobbridge-mo",
      city: "Caulfield",
      state: "MO",
      latitude: 36.9386,
      longitude: -93.0104,
      website: "https://www.cobbridgeoffroad.com",
      phone: "417-284-2582",
      dayPassUSD: 25,
      milesOfTrails: 250,
      acres: 800,
      utvAllowed: true,
      notes:
        "Cobb Ridge offers over 250 miles of trails through 800 acres of Ozark terrain.",
      status: "APPROVED" as const,
      terrain: ["rocks", "trails", "hills"] as Terrain[],
      difficulty: ["moderate", "difficult"] as Difficulty[],
      amenities: ["camping", "restrooms", "food"] as Amenity[],
    },
    {
      name: "Sutton Bluff Recreation Area",
      slug: "suttonbluff-mo",
      city: "Ellington",
      state: "MO",
      latitude: 37.4558,
      longitude: -90.9656,
      website: "https://www.suttonbluff.com",
      phone: "573-663-7777",
      dayPassUSD: 20,
      milesOfTrails: 85,
      acres: 600,
      utvAllowed: true,
      notes:
        "Family-friendly off-road park in the Mark Twain National Forest area.",
      status: "APPROVED" as const,
      terrain: ["rocks", "mud", "trails"] as Terrain[],
      difficulty: ["easy", "moderate"] as Difficulty[],
      amenities: ["camping", "cabins", "restrooms", "showers"] as Amenity[],
    },
    {
      name: "Finger Lakes State Park",
      slug: "fingerlakes-mo",
      city: "Columbia",
      state: "MO",
      latitude: 38.8703,
      longitude: -92.2843,
      website: "https://mostateparks.com/park/finger-lakes-state-park",
      phone: "573-443-5315",
      dayPassUSD: 10,
      milesOfTrails: 75,
      acres: 1132,
      utvAllowed: true,
      notes:
        "Former coal mining area with unique terrain. Designated OHV trails.",
      status: "APPROVED" as const,
      terrain: ["sand", "trails"] as Terrain[],
      difficulty: ["easy", "moderate", "difficult"] as Difficulty[],
      amenities: ["camping", "restrooms"] as Amenity[],
    },
    {
      name: "Black River Falls ATV Park",
      slug: "blackriverfalls-wi",
      city: "Black River Falls",
      state: "WI",
      latitude: 44.2906,
      longitude: -90.8512,
      website: "https://jacksonctywi.gov/visitors/atv-trails",
      phone: "715-284-0205",
      dayPassUSD: 15,
      milesOfTrails: 200,
      acres: 1500,
      utvAllowed: true,
      notes: "Extensive trail system in Jackson County, Wisconsin.",
      status: "APPROVED" as const,
      terrain: ["sand", "mud", "trails"] as Terrain[],
      difficulty: ["easy", "moderate"] as Difficulty[],
      amenities: ["camping", "restrooms", "fuel"] as Amenity[],
    },
  ];

  for (const parkData of parks) {
    const { terrain, difficulty, amenities, ...parkInfo } = parkData;

    const park = await prisma.park.upsert({
      where: { slug: parkInfo.slug },
      update: {},
      create: {
        ...parkInfo,
        terrain: {
          create: terrain.map((t) => ({
            terrain: t,
          })),
        },
        difficulty: {
          create: difficulty.map((d) => ({
            difficulty: d,
          })),
        },
        amenities: {
          create: amenities.map((a) => ({
            amenity: a,
          })),
        },
      },
    });

    console.log(`Created/updated park: ${park.name}`);
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
