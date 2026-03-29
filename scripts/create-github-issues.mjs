#!/usr/bin/env node
// Creates GitHub labels, milestones, and issues for OP-61 through OP-76
// Usage: GITHUB_TOKEN=ghp_xxx node scripts/create-github-issues.mjs
//
// Get a token at: https://github.com/settings/tokens/new
// Required scopes: repo (or just "Issues" under Fine-grained tokens)

const OWNER = "mikesassatelli";
const REPO = "offroad-parks";
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("❌  Set GITHUB_TOKEN env var first.");
  console.error("    Get one at: https://github.com/settings/tokens/new");
  console.error("    Run: GITHUB_TOKEN=ghp_xxx node scripts/create-github-issues.mjs");
  process.exit(1);
}

const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Labels ──────────────────────────────────────────────────────────────────

const LABELS = [
  { name: "operator",  color: "7C3AED", description: "Operator SaaS features" },
  { name: "consumer",  color: "2563EB", description: "Rider-facing features" },
  { name: "infra",     color: "6B7280", description: "Schema, migrations, infra" },
  { name: "phase-0",   color: "D97706", description: "Phase 0 — Data Quality" },
  { name: "phase-2",   color: "16A34A", description: "Phase 2 — Operator Foundation" },
  { name: "phase-3",   color: "DC2626", description: "Phase 3 — First MRR" },
];

async function ensureLabels() {
  console.log("\n=== Labels ===");
  const existing = await api("GET", "/labels?per_page=100");
  const existingNames = new Set(existing.map((l) => l.name));

  for (const label of LABELS) {
    if (existingNames.has(label.name)) {
      console.log(`  ✓ already exists: ${label.name}`);
    } else {
      await api("POST", "/labels", label);
      console.log(`  ✅ created: ${label.name}`);
    }
  }
}

// ─── Milestones ───────────────────────────────────────────────────────────────

const MILESTONE_DEFS = [
  { title: "Phase 0 — Data Quality",        description: "Photo remediation and dev environment setup" },
  { title: "Phase 1 — Consumer Quality",    description: "Trail conditions, pricing, geolocation" },
  { title: "Phase 2 — Operator Foundation", description: "Operator identity, portal shell, claim flow" },
  { title: "Phase 3 — First MRR",           description: "Digital waivers, ticketing, Stripe billing" },
];

async function ensureMilestones() {
  console.log("\n=== Milestones ===");
  const existing = await api("GET", "/milestones?per_page=100&state=all");
  const map = Object.fromEntries(existing.map((m) => [m.title, m.number]));

  for (const ms of MILESTONE_DEFS) {
    if (map[ms.title]) {
      console.log(`  ✓ already exists: "${ms.title}" → #${map[ms.title]}`);
    } else {
      const created = await api("POST", "/milestones", ms);
      map[ms.title] = created.number;
      console.log(`  ✅ created: "${ms.title}" → #${created.number}`);
    }
  }
  return map;
}

// ─── Issues ───────────────────────────────────────────────────────────────────

function issues(milestones) {
  const m2 = milestones["Phase 2 — Operator Foundation"];
  const m3 = milestones["Phase 3 — First MRR"];

  return [
    // E12 — Operator Identity
    {
      key: "OP-61", milestone: m2, labels: ["operator", "infra", "phase-2"],
      title: "Operator Model & Schema Migration",
      body: `Add \`Operator\`, \`OperatorUser\`, \`ParkClaim\` models to \`schema.prisma\`.

Add \`OPERATOR\` to \`UserRole\` enum. Add \`SubscriptionStatus\` + \`SubscriptionTier\` enums.

Key fields: \`stripeCustomerId\`, \`stripeSubscriptionId\`, \`subscriptionStatus\`, \`trialEndsAt\`, \`billingEmail\`.

\`OperatorUser\` role: \`OWNER | MEMBER\`. \`ParkClaim\` tracks \`PENDING / APPROVED / REJECTED\`.

See \`planning/backlog.yaml\` E12/OP-61.`,
    },
    {
      key: "OP-62", milestone: m2, labels: ["operator", "consumer", "phase-2"],
      title: "Park Claim Flow (Consumer Side)",
      body: `"Claim this park" CTA on ParkDetailPage (only when park has no operator).

Claim form: business name, email, phone, ownership description.

\`POST /api/parks/[slug]/claim\` → creates \`ParkClaim\` (status: PENDING) → confirmation email to claimant.

See \`planning/backlog.yaml\` E12/OP-62.`,
    },
    {
      key: "OP-63", milestone: m2, labels: ["operator", "phase-2"],
      title: "Claim Review Admin Queue",
      body: `New admin section: \`/admin/claims\`.

List pending claims with park name, claimant info, date submitted.

- **Approve**: creates \`Operator\` + \`OperatorUser\` records, sets user role to \`OPERATOR\`, sends welcome email.
- **Reject**: sends rejection email with reason.

See \`planning/backlog.yaml\` E12/OP-63.`,
    },
    // E13 — Operator Portal
    {
      key: "OP-64", milestone: m2, labels: ["operator", "phase-2"],
      title: "Operator Portal Shell & Middleware",
      body: `Route: \`/operator/[parkId]/dashboard\`.

Middleware: user must have \`OPERATOR\` role AND be linked to this \`parkId\` via \`OperatorUser\`. Sidebar nav for future sections.

See \`planning/backlog.yaml\` E13/OP-64.`,
    },
    {
      key: "OP-65", milestone: m2, labels: ["operator", "phase-2"],
      title: "Trail Status Management",
      body: `Operators post condition updates: \`OPEN / CLOSED / CAUTION\` + optional notes + optional expiry.

Updates surface on consumer-facing park detail page and park cards.

This is the #1 daily engagement driver — the reason operators log in every day.

See \`planning/backlog.yaml\` E13/OP-65.`,
    },
    {
      key: "OP-66", milestone: m2, labels: ["operator", "phase-2"],
      title: "Operator Listing Editor",
      body: `Operators can update: park description, hours, pricing, amenities, and photos.

Changes go through lightweight admin review or auto-approve with audit log.

See \`planning/backlog.yaml\` E13/OP-66.`,
    },
    // E14 — Billing
    {
      key: "OP-67", milestone: m3, labels: ["operator", "infra", "phase-3"],
      title: "Stripe Subscription Integration",
      body: `Stripe Customer created at claim approval.

Products: \`price_standard_monthly\` ($149/mo), \`price_professional_monthly\` ($249/mo). 14-day free trial on all new claims.

Webhook handlers: \`customer.subscription.updated\`, \`invoice.payment_failed\`, \`customer.subscription.deleted\`.

Gate operator portal features behind \`subscriptionStatus === ACTIVE || TRIAL\`.

See \`planning/backlog.yaml\` E14/OP-67.`,
    },
    {
      key: "OP-68", milestone: m3, labels: ["operator", "phase-3"],
      title: "Billing Portal Link",
      body: `Link to Stripe Customer Portal from operator dashboard for self-serve plan changes and invoice history.

See \`planning/backlog.yaml\` E14/OP-68.`,
    },
    // E15 — Digital Waivers
    {
      key: "OP-69", milestone: m3, labels: ["operator", "infra", "phase-3"],
      title: "Digital Waiver Data Model",
      body: `Add \`Waiver\` (template: custom fields, park branding, published status) and \`WaiverCompletion\` (signed record: IP, user-agent, timestamp, PDF blob URL) to schema.

See \`planning/backlog.yaml\` E15/OP-69.`,
    },
    {
      key: "OP-70", milestone: m3, labels: ["operator", "phase-3"],
      title: "Waiver Builder UI",
      body: `Drag-and-drop custom field builder for operators. Park branding (logo + colors). Preview before publishing.

See \`planning/backlog.yaml\` E15/OP-70.`,
    },
    {
      key: "OP-71", milestone: m3, labels: ["operator", "phase-3"],
      title: "QR Kiosk Mode",
      body: `Full-screen tablet UI for park entrance gate. Visitor fills form + signs digitally. No login required. Works offline with local queue. Park prints a QR code that opens the kiosk URL.

See \`planning/backlog.yaml\` E15/OP-71.`,
    },
    {
      key: "OP-72", milestone: m3, labels: ["operator", "phase-3"],
      title: "Waiver Completion Log",
      body: `Operator dashboard shows all signed waivers with search/filter by date and name. Export to CSV.

This is a compliance/liability tool — operators need proof of signed waivers.

See \`planning/backlog.yaml\` E15/OP-72.`,
    },
    // E16 — Day Pass Ticketing
    {
      key: "OP-73", milestone: m3, labels: ["operator", "infra", "phase-3"],
      title: "Day Pass Ticketing Data Model",
      body: `Add \`PassType\` (day pass, weekend pass, vehicle types, pricing) and \`PassPurchase\` (buyer, date, unique QR code, redeemed status) to schema.

See \`planning/backlog.yaml\` E16/OP-73.`,
    },
    {
      key: "OP-74", milestone: m3, labels: ["operator", "consumer", "phase-3"],
      title: "Consumer Day Pass Purchase",
      body: `Buy a day pass on the park detail page. Stripe Checkout flow. QR code delivered to email on completion.

See \`planning/backlog.yaml\` E16/OP-74.`,
    },
    {
      key: "OP-75", milestone: m3, labels: ["operator", "phase-3"],
      title: "Gate Scan Mobile UI",
      body: `Simple mobile web page for operators. Camera scans QR code → shows green (valid) or red (expired/used/invalid). No app install required — works in mobile browser.

See \`planning/backlog.yaml\` E16/OP-75.`,
    },
    // E17 — Memberships
    {
      key: "OP-76", milestone: m3, labels: ["operator", "infra", "phase-3"],
      title: "Membership Management Data Model",
      body: `Initial schema for annual park memberships: member records, pass types, expiry dates, recurring billing hooks.

See \`planning/backlog.yaml\` E17/OP-76.`,
    },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Creating GitHub issues for ${OWNER}/${REPO}...`);

  await ensureLabels();
  const milestones = await ensureMilestones();

  console.log("\n=== Issues ===");
  const issueMap = {};

  for (const issue of issues(milestones)) {
    const created = await api("POST", "/issues", {
      title: `${issue.key}: ${issue.title}`,
      body: issue.body,
      labels: issue.labels,
      milestone: issue.milestone,
    });
    console.log(`  ✅ #${created.number} — ${issue.key}: ${issue.title}`);
    issueMap[issue.key] = created.number;
    // Small delay to avoid secondary rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("\n=== Issue Map (paste into backlog.yaml) ===");
  for (const [key, num] of Object.entries(issueMap)) {
    console.log(`  ${key}: ${num}`);
  }

  console.log("\n✅ Done! Now set up the Project board at:");
  console.log(`  https://github.com/${OWNER}/${REPO}/projects`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
