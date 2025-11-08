import type { Park } from "@/lib/types";

export const PARKS: Park[] = [
  {
    id: "cobbridge-mo",
    name: "Cobb Ridge Recreation Area (Chadwick)",
    city: "Chadwick",
    state: "MO",
    website: "https://www.fs.usda.gov/recarea/mtnf/recarea/?recid=21766",
    acres: 12500,
    milesOfTrails: 80,
    dayPassUSD: 7,
    utvAllowed: true,
    terrain: ["forest", "hills", "rocky"],
    amenities: ["camping", "trail maps"],
    difficulty: ["easy", "moderate", "hard"],
    notes: "Popular Ozarks singletrack/UTV system near Springfield; dispersed-style camps in loop."
  },
  {
    id: "suttonbluff-mo",
    name: "Sutton Bluff ATV Trail System",
    city: "Centerville",
    state: "MO",
    website: "https://www.fs.usda.gov/recarea/mtnf/recarea/?recid=21774",
    acres: 20000,
    milesOfTrails: 27,
    dayPassUSD: 5,
    utvAllowed: true,
    terrain: ["forest", "hills", "rocky"],
    amenities: ["camping"],
    difficulty: ["easy", "moderate"],
    notes: "River access close by; seasonal closures possible."
  },
  {
    id: "fingerlakes-mo",
    name: "Finger Lakes State Park",
    city: "Columbia",
    state: "MO",
    website: "https://mostateparks.com/park/finger-lakes-state-park",
    acres: 1100,
    milesOfTrails: 70,
    dayPassUSD: 5,
    utvAllowed: true,
    terrain: ["mud", "hardpack"],
    amenities: ["camping", "showers", "trail maps"],
    difficulty: ["easy", "moderate"],
    notes: "MX tracks + trail network on reclaimed mine land; reservable campground."
  },
  {
    id: "blackriverfalls-wi",
    name: "Black River State Forest OHV",
    city: "Black River Falls",
    state: "WI",
    website: "https://dnr.wisconsin.gov/topic/parks/blackriver",
    acres: 68000,
    milesOfTrails: 100,
    dayPassUSD: 0,
    utvAllowed: true,
    terrain: ["forest", "sand"],
    amenities: ["camping", "rv hookups", "trail maps"],
    difficulty: ["easy", "moderate"],
    notes: "Connects to county trail network; sticker requirements apply."
  }
];