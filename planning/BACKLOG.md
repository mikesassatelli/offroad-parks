# Offroad Parks Backlog
<!-- Last updated: 2026-07-15 -->
<!-- Canonical backlog. See also: ROADMAP.md (strategy), SPRINT.md (sprint history). -->

**Status values:** `backlog` · `in-progress` · `done` · `blocked`
**Flags:** `needs-refinement` = not startable without a scoping conversation first

---

## E22 · Release Readiness — Soft Consumer Launch *(current focus)*

**Context:** A July 2026 release-readiness audit found the app is feature-complete for a **free consumer launch** (discovery, reviews, trail conditions, weather, routes, operator portal all shipped), but is missing the legal/compliance, SEO, and production-hardening basics required to open to the public — plus a Google-only login surface. This epic is the **soft consumer launch (path A)** from ROADMAP.md: ship the free rider app, turn on SEO to start the organic flywheel, expand login, and harden for production. **No billing** — paid operator features (E14/E15/E16) stay deferred until pilot operators are hand-signed for free. Once these ship, the "consumer app good enough to show operators" milestone is met.

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-94 | Legal Pages: Privacy, Terms, Cookie Consent | done | feature | 🔴 Blocker. `/legal/privacy` + `/legal/terms` (shared layout) + privacy-preserving cookie-consent banner. Content is a template (`src/lib/legal.ts` placeholders) needing counsel review + real company/contact before launch. PR #146. |
| OP-95 | SEO Foundation: robots + sitemap | done | feature | 🔴 Blocker. Dynamic `src/app/sitemap.ts` (APPROVED parks + static routes), `src/app/robots.ts`, `SITE_URL` helper, `metadataBase`. Verified 200. PR #146. |
| OP-96 | Transactional Email Sender | done | feature | 🔴 Prerequisite. `src/lib/email/send.ts` `sendEmail()` via Resend with a dev fallback (logs when `RESEND_API_KEY` unset — no key needed locally/CI) + shared HTML templates. Production still needs `RESEND_API_KEY` + `EMAIL_FROM` and Resend domain verification (DNS). PR #146. |
| OP-97 | Email Magic-Link Login Provider | done | feature | 🟠 Auth.js "resend" email provider added alongside Google; `sendVerificationRequest` routes through OP-96 sender. `LoginDialog` (Google + email) replaces the direct `signIn("google")` in AppHeader. Verified end-to-end (302 + dev-fallback log). PR #146. |
| OP-98 | Rate Limiting on Public POST Endpoints | done | feature | 🔴 `src/lib/rate-limit.ts` fixed-window limiter applied to public POSTs — reviews (5/h), conditions (10/h), claims (5/day), keyed per user id; 429 + Retry-After. In-process store (per-instance) — adequate for soft launch; swap to a shared store (Upstash) for strict global limits without changing call sites. Unit + reviews-route integration tests. PR #146. |
| OP-99 | Security Headers & CSP | backlog | feature | 🟠 High. `next.config.ts` sets only image `remotePatterns`. Add a `headers()` block: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. Consider Vercel WAF/BotID on the public forms. |
| OP-100 | Production Error Monitoring | backlog | feature | 🟠 High. No Sentry/Datadog in deps. Wire Sentry (Next 16 App Router SDK) so launch-day errors are visible. |
| OP-101 | Input Validation Backfill (Zod) | backlog | refactor | 🟢 Medium. Zod used in only ~4/53 API route files; most handlers trust `req.json()` shape. Not an injection risk (Prisma parameterizes; no raw SQL) but an abuse/correctness surface. Backfill mutating routes, prioritizing the public POSTs from OP-98. Overlaps E9 tech-debt. |
| OP-102 | Docs Drift Cleanup | backlog | chore | 🟢 Low. README "User Roles" lists only USER/ADMIN — stale since OPERATOR (OP-61) and SUPER_ADMIN + `UserPreGrant` pre-grant flow landed. Update the README roles + admin-elevation sections to match (manual Prisma-Studio edit is now a fallback, not the primary path). |
| OP-103 | Provision Domain + Resend Sending Setup | blocked | infra | 🔴 **Blocked: no registered domain yet.** OP-96/OP-97 email works in dev via the console fallback, but **prod sends nothing until this lands.** When a domain is acquired: (1) register it + point DNS; (2) verify a sending domain/subdomain in Resend (SPF/DKIM/DMARC records — has propagation lead time); (3) set `RESEND_API_KEY` + `EMAIL_FROM` (e.g. `noreply@mail.<domain>`) in Vercel prod/preview env; (4) set `NEXT_PUBLIC_SITE_URL` to the real domain; (5) update Google OAuth authorized redirect URIs + move the consent screen to production (needs the live privacy-policy URL from OP-94). **Magic-link login and all transactional email are non-functional in production until then.** Revisit once a domain is chosen. |

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
| OP-77 | AI Data Context Engine (Phase 1) | done | feature | Core pipeline: SerpApi source discovery, Cheerio content extraction, LLM structured extraction (Claude Sonnet via AI SDK), admin review queue, source management UI. 9 modules, 4 Prisma models, 6 API routes, 3 admin pages, 121 tests. Merged 2026-04-06. |
| OP-77a | Source Management Controls | done | feature | Skip/unskip, trust/untrust, wrong-park rejection, one-time robots.txt override, reliability scoring. Merged 2026-04-06. |
| OP-77b | Array Field Additive Handling | done | bug | Array fields (terrain, amenities, camping, vehicleTypes) are now additive — suggestions show only new values, approvals add rather than replace, independent suggestions don't supersede each other. Review queue reconciles stale extractions on load. Merged 2026-04-06. |
| OP-78 | Source Reliability Tiers & Domain Lists | backlog | feature | needs-refinement. Admin-managed trusted/blocked domain lists. Government & known-good sites (riderplanet-usa, state DNR) get high reliability; unreliable registries blocked. Source type hierarchy (government > established directory > unknown registry) weights extraction confidence. |
| OP-79 | Extraction Accuracy Feedback Loop | backlog | feature | needs-refinement. Track approve/reject rates per source domain from admin reviews. High-rejection sources auto-flagged for review or exclusion. Dashboard shows source accuracy trends over time. Passive learning without retraining. |
| OP-80 | Bulk Park Research | backlog | feature | needs-refinement. Admin UI to trigger research for multiple parks at once. Progress tracking, cost estimation before launch, abort capability, rate limiting. |
| OP-81 | Wrong-Park Detection Guard | backlog | feature | needs-refinement. AI validation step confirming extracted data is about the target park, not a neighboring park on the same registry/directory page. Critical for multi-park listing sites that confuse the extractor. Manual wrong-park button shipped in OP-77a; this is the automated AI guard. |
| OP-82 | Extraction Validation Rules | backlog | feature | needs-refinement. Post-extraction business logic: lat/lng in correct state, prices in reasonable ranges, phone numbers valid format, URLs resolve, array values match known enums. Catches AI hallucinations before review queue. |
| OP-83 | Multi-Source Cross-Validation | backlog | feature | needs-refinement. Compare field values across multiple sources. Agreement from 2+ reliable sources raises confidence. Disagreements flagged as conflicts for OP-84 resolution. Feeds into source reliability scoring (OP-78). |
| OP-84 | Field Conflict Resolution UI | backlog | feature | needs-refinement. When multiple sources disagree on a field value, surface conflicts in review queue with side-by-side source comparison. Smart resolution suggestions based on source reliability. |
| OP-89 | Scheduled Research Runs (Vercel Cron) | backlog | feature | needs-refinement. Cron job to auto-research parks with NEEDS_RESEARCH status. Rate limiting, daily token budget cap, prioritize by researchPriority. Distinct from OP-80 (admin-triggered batch). |

---

## E19 · AI Park Discovery *(Phase 3)*

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-85 | Park Discovery: State-Level Search | backlog | feature | needs-refinement. SerpApi queries by state for OHV/offroad parks not in DB. Dedup against existing parks (name + state fuzzy match). Returns candidate list for admin review. |
| OP-86 | Park Discovery: Admin Review & Seeding | backlog | feature | needs-refinement. Admin UI to review discovered park candidates. Accept creates seed Park record (name, state, coordinates if found). Reject blacklists from future discovery. |
| OP-87 | Park Discovery: Auto-Research Pipeline | backlog | feature | After seeding a discovered park, automatically trigger researchPark() to populate fields. Links into existing Phase 1 pipeline. |
| OP-88 | Park Discovery: Batch State Scan | backlog | feature | needs-refinement. Run discovery across all 50 states or a selected set. Progress tracking, dedup across states, cost estimation before launch. |

---

## E20 · Photo Automation *(Phase 2)*

**Problem:** ~2/3 of parks have no approved photo. The current "missing photo" state (large Camera icon on muted gradient in [ParkCard.tsx:82-108](../src/components/parks/ParkCard.tsx)) reads as broken/empty rather than intentional, making the site feel unfinished. Manual photo sourcing (mostly from Google Places) doesn't scale now that AI discovery (E19) adds parks in batches. Prior automated seeding attempt (OP-00 series) failed on provenance — dedup now enforced via `@@unique([url])` on `ParkPhoto`.

**Strategy:** Two-track. (1) Replace default filler so every card looks intentional even without a photo. (2) Automate Google Places photo ingestion with strict provenance (Place ID match confidence, Blob-hosted images) so the old mix-up cannot recur.

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-90 | Park Card Default Filler Redesign | done | feature | Stylized Mapbox sepia thumbnail (USGS-quadrangle legend, Light-sepia treatment) replaces the Camera-icon filler. Pre-generated to Vercel Blob at park creation; live Mapbox fallback. `ParkMapHero` component used on both card + detail-page sidebar. Admin backfill at `/admin/map-heroes`. Merged with OP-90 PR. |
| OP-91 | Google Places Photo Integration | deferred | feature | **Deferred 2026-05-12.** Two blockers: (1) Google Maps Platform ToS §3.2.3 prohibits caching/storing photo Content — we can persist Place IDs but not photo bytes, so the "download to Blob" provenance design is non-compliant. (2) Live-fetch alternative (Places Photo on every render) costs ~$840/mo at projected traffic; even detail-page-only hybrid is ~$84/mo. OP-90 map hero + OP-00D community CTA cover the gap acceptably for now. Revisit if/when traffic + cost economics change. |
| OP-91a | Schema: `googlePlaceId` Field + Backfill Job | deferred | feature | Deferred with parent OP-91. |
| OP-91b | Places Photo Sync Pipeline | deferred | feature | Deferred with parent OP-91. ToS blocker — Places photos cannot be downloaded to our own storage. |
| OP-91c | AI Discovery → Places Integration | deferred | feature | Deferred with parent OP-91. |

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

## E10 · Weather Integration *(Phase 2)*

**Provider: National Weather Service (api.weather.gov).** Free, no API key, US-only (all parks are US-based), authoritative for alerts. Two-step lookup: `/points/{lat},{lng}` → grid identifier (cached indefinitely per park, invalidated on coord edit) → `/gridpoints/.../forecast`. Grid resolution pre-warmed at park creation (alongside map-hero gen).

**Caching (Next.js fetch cache with tags):** grid lookup indefinite, 7-day forecast 6h, current observations 30m, active alerts 10m. All tagged `park:{parkId}:weather` for coord-edit invalidation.

**Parks without coordinates:** weather UI does not render. AI research backfills coords over time.

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-52 | NWS Integration & Caching | backlog | feature | `src/lib/weather/` module: `getOrResolveGrid`, `getForecast`, `getCurrentConditions`, `getActiveAlerts`. Vercel Runtime/Next fetch cache per table above. Identifiable User-Agent header. Hook grid pre-warm into park-creation pipeline. Graceful null fallback on NWS 5xx. Tests for cache hit/miss + error paths. |
| OP-53 | Current & Forecast Weather Display | backlog | feature | `<WeatherCard />` on park detail sidebar. Current temp + conditions icon (Lucide) + feels-like. 5-day forecast row: day, icon, hi/lo, precip%. Loading skeleton + "Weather unavailable" empty state. |
| OP-54 | Weather Alerts & Warnings | backlog | feature | NWS severe+ alerts as banner at top of park detail page (e.g. "Red Flag Warning until 6pm"). Full alerts list in modal on "View all alerts." **Park closure indicators are out of scope** — closures are operator-controlled via OP-65, not weather-driven. |
| OP-55 | Rain Likelihood on Park Cards | backlog | feature | Rain badge (☂ + probability) on `<ParkCard />`. Today's max precip% across the day. Color thresholds: green <20%, amber 20–60%, red >60%. Server-rendered using same cache as OP-53 (most calls cache-hit). Hidden when forecast unavailable. |

---

## E21 · User Notifications *(Future)*

**Premise:** Email notifications triggered by various events (severe weather at favorited parks, new reviews, operator updates, trail conditions). Centralized opt-in/opt-out preferences in user profile — no notification ships without granular user control.

| Key | Title | Status | Type | Notes |
|-----|-------|--------|------|-------|
| OP-92 | Notification Preferences in User Profile | backlog | feature | needs-refinement. New `UserNotificationPreferences` model (or JSON column on `User`). Profile UI section with per-channel toggles: weather-alerts at favorited parks, new-review-on-favorited-park, operator-update, trail-condition-change. Default all OFF; explicit opt-in. One-click unsubscribe link in every email. Foundation for OP-93+. |
| OP-93 | Severe Weather Email Alerts | backlog | feature | needs-refinement. Cron job scans favorited parks for active NWS severe+ alerts; sends email to opted-in users. Dedup so a user gets one email per (park, alert) pair. Depends on OP-92 + OP-54. |

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
