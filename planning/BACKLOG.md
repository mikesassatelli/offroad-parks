# Offroad Parks Backlog
<!-- Last updated: 2026-03-30 -->
<!-- Canonical backlog. See also: ROADMAP.md (strategy), SPRINT.md (sprint history). -->

**Status values:** `backlog` · `in-progress` · `done` · `blocked`
**Flags:** `needs-refinement` = not startable without a scoping conversation first

---

## E0 · Data Quality & Photo Remediation *(Phase 0 — immediate)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-00 | Photo Deduplication Audit & Cleanup | done | bug | Manually deleted all park photos 2026-03-29. Will be more careful with future automated seeding. |
| OP-00B | Admin Photo Reassign Tool | cancelled | feature | Cancelled — not needed after manual wipe approach. |
| OP-00C | Bulk Upload Deduplication Guard | cancelled | feature | Cancelled — manual discipline over automated guard for now. |
| OP-00D | Community Photo Sourcing CTA | done | feature | 'No approved photos' badge in admin park list; prominent 'Add Photos' CTA on ParkDetailPage; show contributor credit on photos. Merged 2026-03-30. |

---

## E5 · Infrastructure & Environment *(Phase 0)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-17 | Expanded Schema Aggregations | done | infra | Implemented schema aggregations for reviews and ratings. |
| OP-27 | Add Dev DB & Migrate to Neon-Managed Postgres | done | infra | Dev Neon branch active; .env points to dev; migrations reset clean; `neon-branch-cleanup.yml` workflow added. Needs NEON_API_KEY + NEON_PROJECT_ID set in GitHub repo secrets/vars. |
| OP-infra-build-db-push | Run `prisma db push` on Every Vercel Build | done | infra | PR #99 merged 2026-03-30. Build script: `prisma db push --accept-data-loss && next build`. Prevents prod schema drift (fixes root cause of P2022 incidents on `isFree` and `operatorId`). |

---

## E3 · Park UI & Layout Improvements *(Phase 1)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-2 | Favorites Button Overlap Bug | done | bug | Fixed favorites button overlap. |
| OP-16 | Sticky Header w/ Breadcrumbs & Refactored Search Bar | done | feature | Sticky header with breadcrumbs and improved search bar. |
| OP-20 | Fix Park Submission/Edit Amenity Labels | done | bug | Human-friendly labels, grouped amenities. |
| OP-18 | Refactor Park Detail Layout to Reduce Scrolling | done | refactor | Tabs layout: Overview, Photos, Reviews, Location. Merged 2026-03-30. |
| OP-23 | Surface New Camping Data in Camping Info Card | done | feature | Icons per camping type (tent/rv/cabin/group/backcountry). Merged 2026-03-30. |
| OP-24 | Surface New Operational Attributes on Detail & Search Cards | done | feature | ParkOperationalCard: dates, ownership, permit/membership/flags/spark badges. Merged 2026-03-30. |
| OP-25 | Add Average Recommended Stay to Park Detail Page | done | feature | averageRecommendedStay stat in ParkOverviewCard. Computed via ordinal mean ceiling from reviews. Merged 2026-03-30. |
| OP-26 | Update Contact/Location Card with Full Address | done | feature | Full address, contact email, shrink-0 icons. Merged 2026-03-30. |

---

## E2 · Park Data Model & Content Expansion *(Phase 1)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-3 | Expand Park Information Schema / Amenities | done | feature | Added amenities + operational data fields. |
| OP-22 | Refactor dayPassUSD into Rich Pricing Fields | done | refactor | isFree + dayPassUSD + vehicleEntryFeeUSD + riderFeeUSD + membershipFeeUSD; formatParkPricingSummary helper; form + UI + API updated. Merged 2026-03-30. |
| OP-29 | Seed Closed/Destroyed Parks for Archival | backlog | feature | needs-refinement. Archived parks dataset; UI treatment; exclude from normal search results. |
| OP-51 | Seed Additional Parks Data | backlog | feature | needs-refinement. Expand database with underrepresented regions; complete all fields. |

---

## E1 · Reviews & User-Generated Content *(Phase 1)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-15 | Park Reviews & Ratings System | done | feature | Trip reports, ratings, helpful votes, moderation, review UI, and aggregation. |
| OP-19 | Expand Recent Reviews Page Functionality | done | feature | PR #97. Rating/vehicle/state filters, pagination, park thumbnails, 'Read More' links. Merged 2026-03-30. |

---

## E4 · Search, Discovery & Filtering *(Phase 1)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-21 | Spike: Validate Filters/Sorts After Schema Expansion | done | spike | Spike doc written; flagsRequired/sparkArrestorRequired filters + most-reviewed sort shipped. Merged 2026-03-30. |
| OP-56 | Parks Near Me (Geolocation) | done | feature | Browser geolocation, haversine distance, distance-nearest sort, Near Me button in SearchHeader, distanceMi on ParkCard. Merged 2026-03-30. |
| OP-28 | Smart/AI-Powered Nearby Services | backlog | feature | needs-refinement. Fuel, diesel, campgrounds, water, RV dump lookup via API/AI; show on park detail. |
| OP-35 | Smart/AI-Powered Park Recommendations | backlog | feature | needs-refinement. AI-powered park recommendations based on preferences. |

---

## E7 · Trail Conditions *(Phase 1)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-37 | Trail Conditions: Data Model & API | done | feature | TrailCondition model (OPEN/CLOSED/CAUTION/MUDDY/WET/SNOW), PUBLISHED/PENDING_REVIEW flow, GET+POST /api/parks/[slug]/conditions. Merged 2026-03-30. |
| OP-38 | Trail Conditions: Submission UI | done | feature | TrailConditionForm: status select + optional note (280 chars), admin review gate when note present. Merged 2026-03-30. |
| OP-39 | Trail Conditions: Display & Voting | done | feature | TrailConditionsDisplay on park detail sidebar: latest condition + age + note, up to 4 older reports. Merged 2026-03-30. |
| OP-40 | Trail Conditions: Expiry & Freshness Logic | done | feature | 72h CONDITION_STALE_AFTER_MS; isConditionFresh + formatConditionAge helpers; stale filter on GET endpoint. Merged 2026-03-30. |
| OP-41 | Trail Conditions: Park Card Integration | done | feature | ConditionBadge on ParkCard; latest fresh condition included in parks list query; latestCondition on Park type. Merged 2026-03-30. |

---

## E12 · Operator Identity & Multi-tenancy *(Phase 2)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-61 | Operator Model & Schema Migration | done | feature | PR #98. Operator, OperatorUser, ParkClaim models; OPERATOR role; SubscriptionStatus/Tier enums; ClaimStatus enum. Merged 2026-03-30. |
| OP-62 | Park Claim Flow (Consumer Side) | done | feature | PR #89 merged 2026-03-30. POST /api/parks/[slug]/claim; ParkClaimCTA sidebar; hasOperator on Park type; hasPendingClaim server-side prop prevents duplicate submissions. |
| OP-63 | Claim Review Admin Queue | done | feature | PR #90 merged 2026-03-30. GET+approve+reject+delete API; /admin/claims tabbed UI; org name required on claim form; submitter info on admin card; operator indicator + "managed by" notice on park page; admin role guard on approve; stale @ts-expect-error cleanup. |

---

## E13 · Operator Portal Core *(Phase 2)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-64 | Operator Portal Shell & Middleware | done | feature | Sprint 3. PR #91 merged. getOperatorContext(); /operator/[parkSlug] layout+dashboard+stubs. |
| OP-65 | Operator Trail Status Management | done | feature | Sprint 3. PR #92 merged. POST/GET operator conditions API; isOperatorPost; Park Management badge on consumer side. |
| OP-66 | Operator Park Listing Editor | done | feature | Sprint 3. PR #93 merged. PATCH endpoint; ParkEditLog audit; /operator/[parkSlug]/settings form. |

---

## E14 · Billing & Subscriptions *(Phase 2)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-67 | Stripe Integration & Subscription Webhooks | backlog | feature | Stripe Products ($149/mo Standard); checkout session; webhook handler for subscription lifecycle; 14-day free trial, no card required. |
| OP-68 | Billing Portal Page | backlog | feature | /operator/[parkSlug]/billing; current plan/status; 'Manage Billing' → Stripe Customer Portal; upgrade prompt on trial. |

---

## E18 · AI Data Context Engine — Quality & Scale *(Phase 2)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-78 | Source Reliability Tiers & Domain Lists | backlog | feature | needs-refinement. Admin-managed trusted/blocked domain lists. Government & known-good sites (riderplanet-usa, state DNR) get high reliability; unreliable registries blocked. Source type hierarchy (government > established directory > unknown registry) weights extraction confidence. |
| OP-79 | Extraction Accuracy Feedback Loop | backlog | feature | needs-refinement. Track approve/reject rates per source domain from admin reviews. High-rejection sources auto-flagged for review or exclusion. Dashboard shows source accuracy trends over time. Passive learning without retraining. |
| OP-80 | Bulk Park Research | backlog | feature | needs-refinement. Admin UI to trigger research for multiple parks at once. Progress tracking, cost estimation before launch, abort capability, rate limiting. |
| OP-81 | Wrong-Park Detection Guard | backlog | feature | needs-refinement. AI validation step confirming extracted data is about the target park, not a neighboring park on the same registry/directory page. Critical for multi-park listing sites that confuse the extractor. |
| OP-82 | Extraction Validation Rules | backlog | feature | needs-refinement. Post-extraction business logic: lat/lng in correct state, prices in reasonable ranges, phone numbers valid format, URLs resolve, array values match known enums. Catches AI hallucinations before review queue. |
| OP-83 | Multi-Source Cross-Validation | backlog | feature | needs-refinement. Compare field values across multiple sources. Agreement from 2+ reliable sources raises confidence. Disagreements flagged as conflicts for OP-84 resolution. Feeds into source reliability scoring (OP-78). |
| OP-84 | Field Conflict Resolution UI | backlog | feature | needs-refinement. When multiple sources disagree on a field value, surface conflicts in review queue with side-by-side source comparison. Smart resolution suggestions based on source reliability. |

---

## E15 · Digital Waivers *(Phase 3)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-69 | Waiver Data Model | backlog | feature | WaiverTemplate, WaiverClause, WaiverCompletion models; stores signature as base64 Text. |
| OP-70 | Waiver Builder (Operator Portal) | backlog | feature | needs-refinement. /operator/[parkSlug]/waivers; create/edit template with clauses; preview mode; activate/deactivate; version history. |
| OP-71 | QR Kiosk Signing Page | backlog | feature | Public /waiver/[parkSlug]; touch-friendly signature pad; auto-reset after completion; QR code in operator portal; mobile-optimized kiosk layout. |
| OP-72 | Waiver Completion Log | backlog | feature | /operator/[parkSlug]/waivers/completions; searchable table; date filter; CSV export. |

---

## E16 · Day Pass Ticketing *(Phase 3)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-73 | Ticket Data Model & Pricing Config | backlog | feature | needs-refinement. TicketType (Adult/Child/Family), Ticket with QR token; daily capacity; operator sets up in portal. |
| OP-74 | Consumer Ticket Purchase | backlog | feature | needs-refinement. 'Buy Day Pass' on ParkDetailPage; Stripe Payment Intents; email QR confirmation; capacity display. |
| OP-75 | Gate Scan (Operator Mobile) | backlog | feature | needs-refinement. /operator/[parkSlug]/tickets/scan; camera QR scanner; validate + mark USED; works offline-first. |

---

## E17 · Membership Management *(Phase 3+)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-76 | Membership Data Model | backlog | feature | needs-refinement. MembershipPlan + MembershipSubscription models; Stripe Connect for operator payouts (5-10% platform take). Defer until ticketing is stable. |

---

## E10 · Weather Integration *(Future)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-52 | Weather API Integration & Caching | backlog | feature | needs-refinement. Provider selection, server-side caching with TTL, background refresh, rate limiting. |
| OP-53 | Current & Forecast Weather Display | backlog | feature | Weather widget on park detail; current conditions + 5-7 day forecast; icons. |
| OP-54 | Weather Alerts & Warnings | backlog | feature | needs-refinement. NWS alerts, severity levels, park closure indicators. |
| OP-55 | Rain Likelihood on Park Cards | backlog | feature | Rain badge on ParkCard; color-coded probability; batch fetching for efficiency. |

---

## E11 · Engagement & Gamification *(Future)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-57 | Visit Tracking | backlog | feature | needs-refinement. Mark as visited, visit date tracking, visit history, map visualization, stats. |
| OP-58 | Achievements & Badges System | backlog | feature | needs-refinement. Achievement definitions with tiers, progress tracking, badge icons, unlock notifications. |
| OP-59 | Public User Profiles | backlog | feature | needs-refinement. Public profile page, privacy settings, achievements/visits/routes display, shareable URL. |
| OP-60 | Leaderboards & Community Stats | backlog | feature | needs-refinement. Global leaderboards, time filters, user ranking, opt-in/out. |

---

## E8 · Saved & Shareable Routes *(Future)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-42 | Routes: Data Model & API | done | feature | Route model with waypoints, ownership, Mapbox routing, share token generation. Shipped with OP-43. |
| OP-43 | Route Builder UI | done | feature | Map integration, teardrop pins, per-waypoint color/icon, drag-and-drop, zoom labels, save & share UI. PR #106 merged 2026-04-03. |
| OP-44 | Route Sharing | backlog | feature | needs-refinement. Unique share tokens, public route view, copy link, OG meta tags. |
| OP-45 | Route Profile Integration | backlog | feature | Routes tab in user profile; list/edit/delete saved routes. |
| OP-46 | GPX Export & Mapping Services | backlog | feature | needs-refinement. GPX download, open in Google/Apple Maps, consider Gaia GPS/onX. |
| OP-47 | Public Route Gallery | backlog | feature | needs-refinement. Browse public routes, search/filter, sort by popularity. Stretch feature. |
| OP-32 | Route Optimization & Turn-by-Turn | backlog | feature | needs-refinement. Multi-stop route optimization, turn-by-turn directions. |

---

## E9 · Tech Debt *(Ongoing)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-48 | Improve Type Safety Across Codebase | done | refactor | PR #94. NextAuth role augmentation; all @ts-expect-error suppressions removed. Merged 2026-03-30. |
| OP-49 | Test Suite Quality Audit | done | refactor | PR #95. Critical-path tests for ConditionBadge, TrailConditionsDisplay, GET /api/reviews/recent. Merged 2026-03-30. |
| OP-50 | Promote Code Reuse & Reduce Duplication | done | refactor | PR #96. requireAdmin/requireAuth helpers extracted; admin conditions routes refactored. Merged 2026-03-30. |
