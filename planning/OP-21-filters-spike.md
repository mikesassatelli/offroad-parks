# OP-21 — Filters & Sorts Spike
<!-- Completed: 2026-03-30 -->

## Summary

Audited all filter and sort coverage against the current Park schema after the OP-3/OP-24 schema expansions. Implemented three quick wins. Documented remaining gaps below.

---

## Quick Wins Implemented (this branch)

| What | Details |
|------|---------|
| **Flags Required filter** | Added `flagsRequired` Yes/No/Any filter in "Rating & Access" section. Same pattern as `permitRequired`. |
| **Spark Arrestor Required filter** | Added `sparkArrestorRequired` Yes/No/Any filter. Safety-critical prep requirement, same pattern. |
| **"Most Reviewed" sort** | Added `reviewCount` descending sort option. Useful for discovery when you want parks with the most community data. |

---

## Filter Coverage After This Branch

| Schema Field | Filter? | Sort? | Notes |
|---|---|---|---|
| `address.state` | ✅ dropdown | — | |
| `terrain[]` | ✅ multi-select | — | |
| `amenities[]` | ✅ multi-select | — | |
| `camping[]` | ✅ multi-select | — | |
| `vehicleTypes[]` | ✅ multi-select | — | |
| `milesOfTrails` | ✅ min slider | ✅ sort | |
| `acres` | ✅ min slider | ✅ sort | |
| `dayPassUSD` | — | ✅ sort | Will be replaced by OP-22 pricing fields |
| `averageRating` | ✅ min dropdown | ✅ sort | |
| `averageDifficulty` | — | ✅ sort (high/low) | |
| `reviewCount` | — | ✅ sort (new) | |
| `ownership` | ✅ dropdown | — | |
| `permitRequired` | ✅ yes/no/any | — | |
| `membershipRequired` | ✅ yes/no/any | — | |
| `flagsRequired` | ✅ yes/no/any (new) | — | |
| `sparkArrestorRequired` | ✅ yes/no/any (new) | — | |

---

## Gaps — Not Implemented (need design decisions)

### `maxVehicleWidthInches`
**Problem:** The field is "max width allowed at this park." A useful filter would be "show me parks that can fit my vehicle (X inches wide)." This requires a user-provided input ("my vehicle width"), not a simple min/max slider on park data.
**Recommendation:** Defer to a future "Vehicle Profile" feature or a simple numeric input filter ("parks that allow vehicles at least X inches wide"). Not straightforward to express in current filter UI.

### `noiseLimitDBA`
**Problem:** A "max noise" filter hides all parks without noise limit data (most parks). Would need a "show only parks with noise data" toggle alongside it.
**Recommendation:** Surface this as a display-only field on park cards/detail for now. Revisit when data coverage improves.

### `averageRecommendedStay` sort
**Problem:** The enum ordering (quickRide → halfDay → fullDay → overnight) is non-obvious to users and would need a label like "Sort by recommended visit length." Also, the `averageRecommendedStay` field was just added in OP-25 and very few parks have data yet.
**Recommendation:** Add once data coverage improves (after Trail Conditions + more reviews).

### `datesOpen` filter
**Problem:** Free text field (e.g. "Year-round", "April–October"). Not filterable without NLP or a structured date range field.
**Recommendation:** Consider migrating to structured `openMonth`/`closeMonth` integer fields in a future data model cleanup.

### `price` sort label
**Current label:** "Lowest Day Pass"
**Problem:** Will be misleading after OP-22 replaces `dayPassUSD` with richer pricing fields.
**Recommendation:** Update sort label and logic as part of OP-22.

---

## Architecture Note: Client-Side vs Server-Side Filtering

All filtering currently runs client-side in `useFilteredParks` (a `useMemo` hook). The server `/api/parks` returns all APPROVED parks with no query parameters.

**Current status:** Fine. The dataset is small (~50 parks). Client-side is simpler and avoids round trips on filter changes.

**When to revisit:** At ~300–500 parks, or if SEO-indexed filtered pages are needed (e.g. `/parks?state=California&terrain=sand`). At that point, move filtering to the API with Prisma `where` clauses and add URL-based state for shareable filtered views.
