# Offroad Parks — Roadmap to First Paying Customer

**Last updated:** March 28, 2026
**Target:** First paying park operator within 16–20 weeks
**Strategy:** Consumer discovery platform (free, drives SEO + traffic) → Operator SaaS (paid tools)

---

## The Two-Sided Marketplace Model

```
RIDER SIDE (free)                    PARK OPERATOR SIDE (paid)
─────────────────────────            ──────────────────────────
Discovery & trail finding     ←→     Operator dashboard
Reviews & trip reports               Trail status management
Saved parks & routes                 Digital waivers (QR kiosk)
Trail status alerts                  Day pass ticketing / POS
Nearby fuel, camping, services       Membership management
                                     Analytics & visitor data
                                     Featured listing on rider app
```

The rider app drives free organic traffic and SEO. Parks pay for operator tools AND get free marketing by being listed. This is the AllTrails / Campspot flywheel.

**Revenue targets:**
- Conservative: 300 parks × $149/mo = **$537K ARR**
- 2-year: 500 parks × $199/mo + 50K riders × $35/yr = **~$3M ARR**

---

## Phase 0 — Data Quality & Foundation (Weeks 1–2)

**Goal:** Fix photo problems, stabilize the data layer, set up dev environment properly.

### Photo Remediation (OP-00 through OP-00D)

**Problem:** Duplicate and mis-assigned photos in the database. Root cause: `ParkPhoto.url` has no `@@unique` constraint, so the same Blob URL can exist as multiple DB records under different parkIds.

**Step-by-step fix:**

1. **Audit** — Run this SQL against the production DB to find all duplicates:
   ```sql
   SELECT url, COUNT(*) as cnt, array_agg(DISTINCT "parkId") as parks
   FROM "ParkPhoto"
   GROUP BY url
   HAVING COUNT(*) > 1
   ORDER BY cnt DESC;
   ```

2. **Identify authoritative parkId** — The Vercel Blob URL path encodes the correct park: `https://...blob.vercel-storage.com/parks/{parkId}/{timestamp}-{filename}`. Any `ParkPhoto` record where `parkId` doesn't match the ID in the URL is a mis-assignment.

3. **Reassign or delete** — Build admin tool at `PATCH /api/admin/photos/[id]` to update `parkId`. Delete any record where the URL doesn't correspond to a real park.

4. **Add schema constraint** — Add `@@unique([url])` to `ParkPhoto` in `schema.prisma` and run migration.

5. **Add dedup guard in bulk upload** — In `/api/admin/photos/bulk-upload/route.ts`, check for existing record with same `url` before calling `prisma.parkPhoto.create`. Use `upsert` or skip-if-exists.

6. **Community photo CTA** — Add "No approved photos" badge in admin park list; add photo submission prompt on park detail pages with no photos.

### Dev Environment (OP-27)
- Create a Neon branch for local dev (branch from production, don't develop against prod)
- Document branch workflow in README

---

## Phase 1 — Consumer Quality (Weeks 3–8)

**Goal:** Make the consumer app good enough to drive organic SEO and keep riders engaged. This is the demand side that makes parks want to be listed.

**Priority stories:**
| Story | Title | Why now |
|---|---|---|
| OP-22 | Rich Pricing Fields | Current `dayPassUSD` is too simple; operators need flexible pricing |
| OP-18 | Park Detail Layout Refactor | First impression for operators evaluating the platform |
| OP-56 | Parks Near Me (Geolocation) | Most-requested consumer feature; drives mobile engagement |
| OP-24 | Operational Attributes | Hours, seasonal access, reservations required |
| OP-37–41 | Trail Conditions Epic | #1 reason riders will return daily; #1 reason operators log in |

**Trail Conditions (E5) is the highest-leverage feature for both sides:**
- Riders: real-time trail status (open/closed/caution) before making the drive
- Operators: a reason to log in every single day (daily active use = retention)
- This is the "hook" that makes the operator portal feel essential, not optional

---

## Phase 2 — Operator Foundation (Weeks 9–14)

**Goal:** Build the operator identity layer and portal shell. No payments yet — just get 5–10 pilot operators onboarded for free to validate the product.

### Operator Identity (E12)

**OP-61 — Schema migration:**
```prisma
model Operator {
  id                   String             @id @default(cuid())
  parkId               String             @unique
  stripeCustomerId     String?            @unique
  stripeSubscriptionId String?            @unique
  subscriptionStatus   SubscriptionStatus @default(TRIAL)
  subscriptionTier     SubscriptionTier   @default(STANDARD)
  trialEndsAt          DateTime?
  billingEmail         String
  users                OperatorUser[]
  claims               ParkClaim[]
  park                 Park               @relation(fields: [parkId], references: [id])
}

model OperatorUser {
  id         String   @id @default(cuid())
  operatorId String
  userId     String
  role       OperatorRole @default(MEMBER)
  operator   Operator @relation(fields: [operatorId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
  @@unique([operatorId, userId])
}

model ParkClaim {
  id          String      @id @default(cuid())
  parkId      String
  userId      String
  status      ClaimStatus @default(PENDING)
  businessName String
  phone       String?
  message     String?     @db.Text
  reviewedBy  String?
  reviewedAt  DateTime?
  createdAt   DateTime    @default(now())
  park        Park        @relation(fields: [parkId], references: [id])
  user        User        @relation(fields: [userId], references: [id])
}

enum SubscriptionStatus { TRIAL ACTIVE PAST_DUE CANCELED }
enum SubscriptionTier   { STANDARD PROFESSIONAL }
enum OperatorRole       { OWNER MEMBER }
enum ClaimStatus        { PENDING APPROVED REJECTED }
```

**OP-62 — Claim flow:** "Claim this park" CTA on park detail page → form → `POST /api/parks/[slug]/claim` → confirmation email.

**OP-63 — Admin claim queue:** `/admin/claims` page. Approve → creates Operator + OperatorUser + sends welcome email. Reject → sends reason email.

### Operator Portal (E13)

**OP-64 — Portal shell:** `/operator/[parkId]/dashboard`. Middleware: user must have `OPERATOR` role AND be linked to this parkId via OperatorUser. Sidebar nav for future sections.

**OP-65 — Trail status management:** Operators post condition updates (OPEN/CLOSED/CAUTION + notes + expiry). Updates surface on the consumer-facing park detail and park cards. This is the #1 daily engagement driver.

**OP-66 — Listing editor:** Operators can update park description, hours, pricing, amenities, photos. Changes go through a lightweight admin review or auto-approve with audit log.

### Go-to-Market: First 10 Operators

Reach out directly to 10–20 private parks this week:
1. Find parks in the DB that have good data but no photos or incomplete hours
2. Email the operator: "Your park is listed on [domain]. We're building a free operator portal — trail status updates, digital waivers, online ticketing. Want early access?"
3. Offer: **free for 6 months** in exchange for feedback and a testimonial
4. Parks get a real incentive: free marketing on the discovery platform

---

## Phase 3 — First Payment Features (Weeks 15–20)

**Goal:** Add the features operators will pay for. Launch paid tier. Get first MRR.

### Digital Waivers (E15) — Primary paid value proposition

**OP-69 — Data model:** `Waiver` (template), `WaiverCompletion` (signed record with IP, user-agent, timestamp, PDF).

**OP-70 — Waiver builder:** Drag-and-drop custom field builder. Park branding (logo + colors). Preview before publishing.

**OP-71 — QR kiosk mode:** Full-screen tablet UI. Visitor fills in form + signs. No login required. Works offline with local queue. Park prints a QR code for their entrance gate.

**OP-72 — Completion log:** Operator dashboard shows all signed waivers with search/filter. Export to CSV. Required for liability purposes — this is a compliance tool, not a nice-to-have.

### Day Pass Ticketing (E16) — Unlock online revenue

**OP-73 — Data model:** `PassType` (day pass, weekend pass, vehicle types), `PassPurchase` (buyer, date, QR code, redeemed).

**OP-74 — Consumer purchase:** Buy a day pass on the park detail page. Stripe Checkout. QR code delivered to email.

**OP-75 — Gate scan:** Simple mobile web page for operators. Camera scans QR → shows green (valid) or red (expired/used). No app install required.

### Billing (E14)

**OP-67 — Stripe integration:**
- Stripe Customer created at claim approval
- `price_standard_monthly` ($149/mo) and `price_professional_monthly` ($249/mo) products
- 14-day free trial on all new claims
- Webhook handlers: `customer.subscription.updated`, `invoice.payment_failed`, `customer.subscription.deleted`
- Gate operator portal features behind `subscriptionStatus === ACTIVE || subscriptionStatus === TRIAL`

**OP-68 — Billing portal:** Link to Stripe Customer Portal from operator dashboard for self-serve plan changes and invoice history.

### Pricing

| Tier | Price | Includes |
|---|---|---|
| **Standard** | $149/mo | Trail status, listing editor, digital waivers (unlimited), waiver log |
| **Professional** | $249/mo | Everything in Standard + day pass ticketing, gate scan, analytics, featured listing |

---

## Phase 4 — Scale (Months 6–12)

Once 20+ paying operators are live:

- **Membership management (E17):** Annual pass database, member cards, recurring billing integration
- **Consumer premium tier:** $35/yr for offline maps, ad-free, advanced trip planning
- **SEO push:** "offroad parks near [city/state]" — currently zero authoritative competition
- **Rider engagement (E11):** Visit tracking, achievements, public profiles — drives the consumer flywheel
- **Weather integration (E10):** Real-time conditions on park cards — major discovery signal

---

## GitHub Projects Setup

The project uses GitHub Issues for tracking. To set up the board:

**Existing issues:** OP-1 through OP-60 have GitHub issue numbers in `backlog.yaml`.

**New issues to create** (OP-61 through OP-76 currently have `githubIssue: null`):

1. Go to the repo → Issues → New Issue for each of:
   - OP-61: Operator Model & Schema Migration
   - OP-62: Park Claim Flow (Consumer Side)
   - OP-63: Claim Review Admin Queue
   - OP-64: Operator Portal Shell & Middleware
   - OP-65: Trail Status Management
   - OP-66: Operator Listing Editor
   - OP-67: Stripe Subscription Integration
   - OP-68: Billing Portal Link
   - OP-69: Waiver Data Model
   - OP-70: Waiver Builder UI
   - OP-71: QR Kiosk Mode
   - OP-72: Waiver Completion Log
   - OP-73: Day Pass Ticketing Data Model
   - OP-74: Consumer Day Pass Purchase
   - OP-75: Gate Scan Mobile UI
   - OP-76: Membership Management Data Model

2. Create a **GitHub Project (Projects v2)** board:
   - Name: "Offroad Parks Roadmap"
   - Columns: `Backlog` | `Sprint Candidate` | `In Progress` | `In Review` | `Done`

3. Add **labels** to the repo:
   - `epic` (orange) — marks epic-level issues
   - `operator` (purple) — operator SaaS features
   - `consumer` (blue) — rider-facing features
   - `infra` (gray) — schema, migrations, devops
   - `phase-2` (green) — Phase 2 work
   - `phase-3` (red) — Phase 3 work

4. Create **milestones**:
   - `Phase 0 — Data Quality` (2 weeks)
   - `Phase 1 — Consumer Quality` (6 weeks)
   - `Phase 2 — Operator Foundation` (6 weeks)
   - `Phase 3 — First MRR` (6 weeks)

5. Update `backlog.yaml` with the resulting issue numbers for OP-61 through OP-76.

---

## What to Work on Right Now

**This week:**
1. Run photo audit SQL — identify duplicates and mis-assignments
2. Add `@@unique([url])` to `ParkPhoto` in schema.prisma + run migration
3. Add dedup guard in bulk upload API
4. Email 10–20 parks from the database: introduce the platform, offer free early access

**Next week:**
1. Trail conditions schema + API (OP-37/38) — highest leverage feature
2. Trail conditions UI on park detail (OP-39)
3. Parks near me geolocation (OP-56)

The goal for the next 8 weeks is: **a consumer app good enough to show operators, and an operator portal with trail status management**. That's the demo you use to sign your first 10 free pilots. Then you add billing.
