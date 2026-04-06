# Sprint 3 · Week of 2026-03-31

## Goal
Lay the Phase 2 operator foundation while closing consumer-side tech-debt: ship the Operator data model + claim flow + admin queue + portal shell, and tighten type safety, test quality, and code reuse across the codebase.

## In Progress
*(none)*

## Up Next
*(none)*

## Blocked
*(none)*

## Done This Sprint
- [x] ~~OP-48~~ Improve Type Safety Across Codebase — PR #94 merged 2026-03-30; NextAuth role augmentation; remove all @ts-expect-error suppressions
- [x] ~~OP-49~~ Test Suite Quality Audit — PR #95 merged 2026-03-30; ConditionBadge + TrailConditionsDisplay + GET /api/reviews/recent critical-path tests
- [x] ~~OP-50~~ Promote Code Reuse & Reduce Duplication — PR #96 merged 2026-03-30; requireAdmin/requireAuth helpers; admin conditions routes refactored
- [x] ~~OP-19~~ Expand Recent Reviews Page — PR #97 merged 2026-03-30; rating/vehicle/state filters; pagination; park thumbnails; Read More links
- [x] ~~OP-61~~ Operator Model & Schema Migration — PR #98 merged 2026-03-30; Operator, OperatorUser, ParkClaim models; OPERATOR role; subscription enums
- [x] ~~OP-62~~ Park Claim Flow (Consumer Side) — PR #89 merged 2026-03-30; POST /api/parks/[slug]/claim; ParkClaimCTA sidebar component; hasOperator on Park type; 18 tests; post-merge fix: hasPendingClaim server-side prop prevents duplicate submissions across refreshes
- [x] ~~OP-63~~ Claim Review Admin Queue — PR #90 merged 2026-03-30; GET+approve+reject+delete API; /admin/claims tabbed UI; org name on claim form; submitter info on admin card; operator indicator + "managed by" notice on park page; admin role guard on approve; type fixes
- [x] ~~OP-64~~ Operator Portal Shell & Middleware — PR #91; getOperatorContext(); /operator/[parkSlug] layout+dashboard+stubs; 6 tests
- [x] ~~OP-65~~ Operator Trail Status Management — PR #92; POST/GET /api/operator/parks/[parkSlug]/conditions; isOperatorPost flag; Park Management badge; 7 tests
- [x] ~~OP-66~~ Operator Park Listing Editor — PR #93; PATCH /api/operator/parks/[parkSlug]; ParkEditLog audit; /operator/[parkSlug]/settings form; 8 tests
- [x] ~~infra~~ Run `prisma db push` on Every Vercel Build — PR #99 merged 2026-03-30; prevents prod P2022 schema drift; fixes root cause of `isFree` + `operatorId` incidents
- [x] ~~OP-42/43~~ Routes Data Model + Route Builder UI — PR #106 merged 2026-04-03; SavedRoute model, Mapbox directions, custom waypoints, teardrop pins, per-waypoint color/icon picker, zoom-based park labels, save & share with copy link

## Notes / Decisions
- OP-48/49/50 are tech-debt — start here as they improve the codebase for all Phase 2 work
- OP-19 is marked needs-refinement but the scope is well-understood from the backlog note; proceeding
- OP-61 is the critical dependency for OP-62/63/64/65/66; implement first
- OP-62/63 are the consumer + admin halves of the claim flow; ship together
- OP-64 can be stubbed with minimal middleware and fleshed out as OP-65/66 land
- OP-65 builds on OP-37 (done) and OP-61; OP-66 builds on OP-22 (done) and OP-61
- All Phase 2 work assumes no Stripe integration yet (OP-67/68 deferred to a later sprint)

---

# Sprint 2 · Week of 2026-03-30

## Goal
Make the consumer app compelling enough to demo to park operators: ship Trail Conditions end-to-end, add Parks Near Me, clean up pricing schema, and close the photo gap with a community sourcing CTA.

## In Progress
*(none)*

## Up Next
*(none)*

## Blocked
*(none)*

## Done This Sprint
- [x] ~~OP-21~~ Spike: Validate Filters/Sorts After Schema Expansion — merged 2026-03-30; spike doc written; flags/spark/most-reviewed quick wins shipped
- [x] ~~OP-00D~~ Community Photo Sourcing CTA — merged 2026-03-30; admin badge, ParkDetailPage CTA, contributor credit in gallery
- [x] ~~OP-56~~ Parks Near Me (Geolocation) — merged 2026-03-30; geolocation, haversine distance, sort by proximity
- [x] ~~OP-37~~ Trail Conditions: Data Model & API — merged 2026-03-30; TrailCondition model, PUBLISHED/PENDING_REVIEW flow, GET+POST endpoints
- [x] ~~OP-38~~ Trail Conditions: Submission UI — merged 2026-03-30; status selector + optional note, admin review gate on notes
- [x] ~~OP-39~~ Trail Conditions: Display & Voting — merged 2026-03-30; TrailConditionsDisplay on park detail sidebar
- [x] ~~OP-40~~ Trail Conditions: Expiry & Freshness Logic — merged 2026-03-30; 72h staleness threshold, formatConditionAge
- [x] ~~OP-41~~ Trail Conditions: Park Card Integration — merged 2026-03-30; ConditionBadge on ParkCard
- [x] ~~OP-22~~ Refactor dayPassUSD into Rich Pricing Fields — merged 2026-03-30; isFree + vehicle/rider/membership fees, formatParkPricingSummary

## Notes / Decisions
- OP-37–41 shipped as one consolidated feature branch (`feature/op-37-41-trail-conditions`)
- Trail condition note flow: no note = PUBLISHED immediately; any note text = PENDING_REVIEW for admin approval
- Staleness threshold: 72h non-configurable (`CONDITION_STALE_AFTER_MS`)
- OP-21 is a spike — output is a written proposal, not shipped code
- OP-19 (Expand Recent Reviews Page) deferred to Sprint 3

---

# Sprint 1 · Week of 2026-03-29 ✅

## Goal
Complete Phase 0: photo data integrity + dev DB setup, unblocking clean Phase 1 feature work. Kick off Phase 1 with high-value UI polish stories.

## Done
- [x] ~~OP-00~~ Photo Deduplication Audit & Cleanup — manually deleted all park photos 2026-03-29
- [x] ~~OP-27~~ Add Dev DB & Migrate to Neon-Managed Postgres — dev Neon branch active, cleanup workflow verified 2026-03-29
- [x] ~~OP-25~~ Average Recommended Stay in ParkOverviewCard — merged 2026-03-30 (ordinal mean ceiling from reviews, dev seed script)
- [x] ~~OP-26~~ Full Address & Contact Email in ParkContactSidebar — merged 2026-03-30
- [x] ~~OP-23~~ Icons in CampingInfoCard — merged 2026-03-30
- [x] ~~OP-24~~ ParkOperationalCard (permit, membership, noise, dates, ownership) — merged 2026-03-30
- [x] ~~OP-18~~ Park Detail Tabs Layout — merged 2026-03-30

## Notes
- OP-00B and OP-00C cancelled — manually wiped photos; will be more careful with future automated seeding
- OP-18 depended on OP-24 (ParkOperationalCard) — resolved via merge conflict
