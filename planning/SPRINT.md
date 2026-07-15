# Sprint 7 · Week of 2026-07-15

## Goal
**Release readiness — soft consumer launch (E22).** The app is feature-complete for a free rider launch; this sprint closes the legal/SEO/hardening gaps that block opening to the public, and expands login. No billing — paid operator features stay deferred until free pilots are signed. Target: the site is safe and legal to point real traffic at, with SEO turned on.

## In Progress
- [ ] OP-94 — Legal pages: privacy, terms, cookie consent *(starting first — unblocks Google OAuth prod + future Stripe)*
- [ ] OP-95 — SEO foundation: `robots.ts` + dynamic `sitemap.ts`

## Up Next
- [ ] OP-96 — Transactional email sender (Resend) *(shared prerequisite for OP-97 + OP-93 + claim emails)*
- [ ] OP-97 — Email magic-link login provider *(depends OP-96)*
- [ ] OP-98 — Rate limiting on public POST endpoints
- [ ] OP-99 — Security headers & CSP in `next.config.ts`
- [ ] OP-100 — Production error monitoring (Sentry)

## Backlog / stretch
- [ ] OP-101 — Zod validation backfill on mutating routes
- [ ] OP-102 — README docs-drift cleanup (roles / admin elevation)

## Blocked
*(none)*

## Notes / Decisions
- Release path chosen: **A — soft consumer launch** (free rider app + SEO flywheel + free pilot operators), not the fully-monetized path. Billing (E14), waivers (E15), ticketing (E16) remain deferred. Rationale: code is ready for A now; don't let Stripe block the SEO compounding.
- OP-94 first: it's the cheapest high-impact blocker and gates the Google OAuth production consent screen.
- OP-96 is deliberately a *shared* email sender, not per-feature — it unblocks magic-link login (OP-97), claim/welcome emails, and the already-planned E21 severe-weather alerts (OP-93).
- Audit re-verified against master @ 8f6e477: legal pages, robots/sitemap, rate limiting, security headers, and error monitoring are all still absent; login is still Google-only.
- Login recommendation: add email magic-link only. Keep Google. Skip username/password (breach liability) and Apple (until/unless a native app ships).

---

# Sprint 6 · Week of 2026-05-11

## Goal
Ship weather integration end-to-end: NWS-backed forecast + current conditions on park detail, severe-alert banner, and rain-likelihood badge on park cards. All four E10 stories.

## In Progress
*(none)*

## Up Next
*(none — focused sprint on E10)*

## Blocked
*(none)*

## Done This Sprint
- [x] ~~OP-52~~ NWS Integration & Caching — PR #138 merged 2026-05-12. `src/lib/weather/` with grid resolution, forecast (6h cache), current obs (30m), alerts (10m); coord-edit handler busts the per-park tag. Identifiable User-Agent. Graceful null/empty on NWS 5xx. 32 tests.
- [x] ~~OP-53~~ Current & Forecast Weather Display — PR #138 merged 2026-05-12. `<WeatherCard />` between TrailConditionsDisplay and ParkContactSidebar on the park detail sidebar. Self-hides on missing data. 9 component tests.
- [x] ~~OP-54~~ Weather Alerts & Warnings — PR #139 merged 2026-05-12. `<WeatherAlertsBanner />` shows Severe+ NWS alerts at the top of the park detail page with a "View all alerts" Dialog listing every active alert by severity. Park-closure indicator dropped per E10 lock-in. 9 tests.
- [x] ~~OP-55~~ Rain Likelihood on Park Cards — PR #140 merged 2026-05-12. `<RainBadge />` at `bottom-2 right-2` on `<ParkCard />`. Color thresholds green <20% / amber 20–60% / red >60%. Batched server-side fetch (`getBatchRainProbabilities`) with per-park 2s timeout + 12-way concurrency cap; subsequent renders cache-hit. 19 tests.

## Notes / Decisions
- E20 OP-91 (Google Places) deferred: Google Maps Platform ToS prohibits caching photo Content; live-fetch alternative costs ~$840/mo at projected traffic. OP-90 map hero + OP-00D community CTA cover the gap acceptably.
- New epic E21 (User Notifications) created. OP-93 (severe-weather email alerts) shelved behind OP-92 (preferences foundation) — explicit opt-in only, every channel toggleable from profile.
- E10 caching: forecast 6h, current obs 30m, alerts 10m, grid indefinite; coord-edit handler revalidates the per-park weather tag. First-render cost on the parks-list page is bounded by a 2s per-park timeout + concurrency cap of 12.
- OP-54 dropped the "park closure indicator" — closures stay operator-controlled via OP-65; auto-closing on weather data is too high-stakes.

---

# Sprint 5 · Week of 2026-04-14

## Goal
Close the biggest "unfinished" gap on the consumer site: parks without photos. Ship a better default visual so no park card ever looks broken, then automate Google Places photo sourcing so the AI discovery pipeline stops bottlenecking on manual photo hunts.

## In Progress
*(none)*

## Up Next
*(deferred — see Sprint 6)*

## Blocked
*(none)*

## Done This Sprint
- [x] ~~OP-90~~ Park Card Default Filler Redesign — stylized sepia map hero (Option 2A.iii, "Light sepia" intensity) replaces the Camera-icon filler for parks without user photos. Reusable `ParkMapHero` component on both the card grid and detail-page sidebar; pre-generated to Vercel Blob at park-creation time with live Mapbox as fallback. Admin backfill at `/admin/map-heroes`. Tracked design-calibration chapters: 4 variants → 5 V2 flavors → 5 typography options → final 3 → 4 finalists → vintage intensity calibration.
- [x] ~~fix/leaflet-ssr~~ Pre-existing `GET /` SSR error — Leaflet touched `window` at module load via PIN_COLORS import chain (RouteListItem → markers.ts → L.icon). Fixed by extracting PIN_COLORS into its own SSR-safe module. Shipped as a dedicated commit on the OP-90 PR.
- [x] ~~fix/condition-badge~~ Pre-existing bug — `trailConditions` not included in main page query, so `latestCondition` was always undefined on cards and the ConditionBadge never rendered. 3-line fix included on the OP-90 PR.

## Notes / Decisions
- OP-90 calibration was iterative: started with 4 strategic directions (map hero / topo / generative poster / typography), narrowed to 5 V2 flavors, then 5 typography options, then 4 finalists, then a final vintage-intensity sweep after feedback that the initial sepia+multiply treatment read as "washed out." Final recipe: sepia 0.3, saturate 1.0, contrast 1.03, hue-rotate -5deg, no multiply blend, vignette at 0.15.
- Level-3 Blob caching ships with OP-90 (not deferred): pre-generation happens at park creation (user submit, admin bulk, AI discovery approval) and on admin coord edits. Mapbox is live-fallback only.
- OP-91 splits into schema/backfill (91a), photo sync (91b), and discovery integration (91c). 91a must ship first; 91b and 91c can run in parallel once 91a lands.
- Provenance discipline: every Places-sourced photo is downloaded to our Blob storage at `parks/{parkId}/places-{hash}.jpg`. The `@@unique([url])` constraint added after OP-00 makes the old cross-park mix-up structurally impossible.
- Auto-approve vs. admin-queue for 91b photos is deferred — will decide during implementation based on initial sample quality.

---

# Sprint 4 · Week of 2026-04-07 ✅

## Goal
Ship AI data context engine quality improvements and the first park discovery epic.

## Done
- [x] ~~OP-77~~ AI Data Context Engine (Phase 1) — PR #107 merged 2026-04-06; SerpApi + Cheerio + Claude Sonnet pipeline, admin review queue, 121 tests
- [x] ~~OP-77a~~ Source Management Controls — merged with OP-77; skip/unskip, trust/untrust, wrong-park rejection
- [x] ~~OP-77b~~ Array Field Additive Handling — PR #108/#109; additive suggestions, stale extraction reconciliation
- [x] ~~discovery fix~~ Remove exact-match quotes from discovery search queries — PR #115 merged 2026-04-06
- [x] ~~planning~~ Backlog updated with AI engine shipped work and E18/E19 epics — PRs #112/#113/#114 merged 2026-04-06

---

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
