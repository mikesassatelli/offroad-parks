#!/usr/bin/env bash
# Creates GitHub labels, milestones, and issues for OP-61 through OP-76
# Run from the repo root: bash scripts/create-github-issues.sh
# Requires: gh CLI authenticated (gh auth status)

set -e

REPO="mikesassatelli/offroad-parks"

echo "=== Creating labels ==="
gh label create "operator"  --color "#7C3AED" --description "Operator SaaS features"   --repo "$REPO" 2>/dev/null || echo "  label 'operator' already exists"
gh label create "consumer"  --color "#2563EB" --description "Rider-facing features"    --repo "$REPO" 2>/dev/null || echo "  label 'consumer' already exists"
gh label create "infra"     --color "#6B7280" --description "Schema, migrations, infra" --repo "$REPO" 2>/dev/null || echo "  label 'infra' already exists"
gh label create "phase-2"   --color "#16A34A" --description "Phase 2 — Operator Foundation" --repo "$REPO" 2>/dev/null || echo "  label 'phase-2' already exists"
gh label create "phase-3"   --color "#DC2626" --description "Phase 3 — First MRR"      --repo "$REPO" 2>/dev/null || echo "  label 'phase-3' already exists"
gh label create "phase-0"   --color "#D97706" --description "Phase 0 — Data Quality"   --repo "$REPO" 2>/dev/null || echo "  label 'phase-0' already exists"

echo ""
echo "=== Creating milestones ==="
M0=$(gh api repos/$REPO/milestones -f title="Phase 0 — Data Quality"        -f description="Photo remediation and dev environment setup" --jq '.number' 2>/dev/null || echo "exists")
M1=$(gh api repos/$REPO/milestones -f title="Phase 1 — Consumer Quality"    -f description="Trail conditions, pricing, geolocation"      --jq '.number' 2>/dev/null || echo "exists")
M2=$(gh api repos/$REPO/milestones -f title="Phase 2 — Operator Foundation" -f description="Operator identity, portal shell, claim flow"  --jq '.number' 2>/dev/null || echo "exists")
M3=$(gh api repos/$REPO/milestones -f title="Phase 3 — First MRR"           -f description="Digital waivers, ticketing, Stripe billing"   --jq '.number' 2>/dev/null || echo "exists")

# Fetch milestone numbers by title in case they already existed
get_milestone() {
  gh api repos/$REPO/milestones --jq ".[] | select(.title == \"$1\") | .number"
}
M0="Phase 0 — Data Quality"
M1="Phase 1 — Consumer Quality"
M2="Phase 2 — Operator Foundation"
M3="Phase 3 — First MRR"

echo "  Phase 0 milestone: #$M0"
echo "  Phase 1 milestone: #$M1"
echo "  Phase 2 milestone: #$M2"
echo "  Phase 3 milestone: #$M3"

echo ""
echo "=== Creating issues ==="

create_issue() {
  local KEY="$1"
  local TITLE="$2"
  local LABELS="$3"
  local MILESTONE="$4"
  local BODY="$5"

  # gh issue create prints the issue URL, e.g. https://github.com/owner/repo/issues/57
  URL=$(gh issue create \
    --repo "$REPO" \
    --title "$KEY: $TITLE" \
    --body "$BODY" \
    --label "$LABELS" \
    --milestone "$MILESTONE")
  NUM="${URL##*/}"
  echo "  Created #$NUM — $KEY: $TITLE"
  echo "$KEY=$NUM" >> /tmp/op-issue-map.txt
}

rm -f /tmp/op-issue-map.txt

# E12 — Operator Identity
create_issue "OP-61" "Operator Model & Schema Migration" \
  "operator,infra,phase-2" "$M2" \
  "Add \`Operator\`, \`OperatorUser\`, \`ParkClaim\` models to \`schema.prisma\`.\n\nAdd \`OPERATOR\` to \`UserRole\` enum. Add \`SubscriptionStatus\` + \`SubscriptionTier\` enums.\n\nFields: \`stripeCustomerId\`, \`stripeSubscriptionId\`, \`subscriptionStatus\`, \`trialEndsAt\`, \`billingEmail\`.\n\n\`OperatorUser\` has \`role: OWNER | MEMBER\`. \`ParkClaim\` tracks pending/approved/rejected requests.\n\nSee \`planning/backlog.yaml\` (E12/OP-61)."

create_issue "OP-62" "Park Claim Flow (Consumer Side)" \
  "operator,consumer,phase-2" "$M2" \
  "'Claim this park' CTA on ParkDetailPage (only when park has no operator).\n\nClaim form: business name, email, phone, ownership description.\n\n\`POST /api/parks/[slug]/claim\` creates \`ParkClaim\` with status \`PENDING\`. Sends confirmation email to claimant.\n\nSee \`planning/backlog.yaml\` (E12/OP-62)."

create_issue "OP-63" "Claim Review Admin Queue" \
  "operator,phase-2" "$M2" \
  "New admin section: \`/admin/claims\`.\n\nList pending claims with park name, claimant info, date submitted.\n\n- **Approve**: creates \`Operator\` + \`OperatorUser\` records, sets user role to \`OPERATOR\`, sends welcome email.\n- **Reject**: sends rejection email with reason.\n\nSee \`planning/backlog.yaml\` (E12/OP-63)."

# E13 — Operator Portal
create_issue "OP-64" "Operator Portal Shell & Middleware" \
  "operator,phase-2" "$M2" \
  "Route: \`/operator/[parkId]/dashboard\`.\n\nMiddleware: user must have \`OPERATOR\` role AND be linked to this \`parkId\` via \`OperatorUser\`. Sidebar nav for future sections.\n\nSee \`planning/backlog.yaml\` (E13/OP-64)."

create_issue "OP-65" "Trail Status Management" \
  "operator,phase-2" "$M2" \
  "Operators post condition updates: \`OPEN\` / \`CLOSED\` / \`CAUTION\` + notes + optional expiry.\n\nUpdates surface on the consumer-facing park detail and park cards. This is the #1 daily engagement driver for operators.\n\nSee \`planning/backlog.yaml\` (E13/OP-65)."

create_issue "OP-66" "Operator Listing Editor" \
  "operator,phase-2" "$M2" \
  "Operators can update: park description, hours, pricing, amenities, and photos.\n\nChanges go through lightweight admin review or auto-approve with audit log.\n\nSee \`planning/backlog.yaml\` (E13/OP-66)."

# E14 — Billing
create_issue "OP-67" "Stripe Subscription Integration" \
  "operator,infra,phase-3" "$M3" \
  "Stripe Customer created at claim approval.\n\nProducts: \`price_standard_monthly\` (\$149/mo), \`price_professional_monthly\` (\$249/mo).\n\n14-day free trial on all new claims.\n\nWebhook handlers: \`customer.subscription.updated\`, \`invoice.payment_failed\`, \`customer.subscription.deleted\`.\n\nGate operator portal behind \`subscriptionStatus === ACTIVE || TRIAL\`.\n\nSee \`planning/backlog.yaml\` (E14/OP-67)."

create_issue "OP-68" "Billing Portal Link" \
  "operator,phase-3" "$M3" \
  "Link to Stripe Customer Portal from operator dashboard for self-serve plan changes and invoice history.\n\nSee \`planning/backlog.yaml\` (E14/OP-68)."

# E15 — Digital Waivers
create_issue "OP-69" "Digital Waiver Data Model" \
  "operator,infra,phase-3" "$M3" \
  "Add \`Waiver\` (template with custom fields, park branding) and \`WaiverCompletion\` (signed record with IP, user-agent, timestamp, PDF blob URL) to schema.\n\nSee \`planning/backlog.yaml\` (E15/OP-69)."

create_issue "OP-70" "Waiver Builder UI" \
  "operator,phase-3" "$M3" \
  "Drag-and-drop custom field builder for operators. Park branding (logo + colors). Preview before publishing.\n\nSee \`planning/backlog.yaml\` (E15/OP-70)."

create_issue "OP-71" "QR Kiosk Mode" \
  "operator,phase-3" "$M3" \
  "Full-screen tablet UI for park entrance gate. Visitor fills form + signs digitally. No login required. Works offline with local queue. Park prints QR code that opens the kiosk URL.\n\nSee \`planning/backlog.yaml\` (E15/OP-71)."

create_issue "OP-72" "Waiver Completion Log" \
  "operator,phase-3" "$M3" \
  "Operator dashboard shows all signed waivers with search/filter by date, name. Export to CSV. Required for liability — this is a compliance tool.\n\nSee \`planning/backlog.yaml\` (E15/OP-72)."

# E16 — Day Pass Ticketing
create_issue "OP-73" "Day Pass Ticketing Data Model" \
  "operator,infra,phase-3" "$M3" \
  "Add \`PassType\` (day pass, weekend pass, vehicle types, pricing) and \`PassPurchase\` (buyer, date, QR code, redeemed status) to schema.\n\nSee \`planning/backlog.yaml\` (E16/OP-73)."

create_issue "OP-74" "Consumer Day Pass Purchase" \
  "operator,consumer,phase-3" "$M3" \
  "Buy a day pass on the park detail page. Stripe Checkout flow. QR code delivered to email on completion.\n\nSee \`planning/backlog.yaml\` (E16/OP-74)."

create_issue "OP-75" "Gate Scan Mobile UI" \
  "operator,phase-3" "$M3" \
  "Simple mobile web page for operators. Camera scans QR code → shows green (valid) or red (expired/used/invalid). No app install required — works in mobile browser.\n\nSee \`planning/backlog.yaml\` (E16/OP-75)."

# E17 — Memberships
create_issue "OP-76" "Membership Management Data Model" \
  "operator,infra,phase-3" "$M3" \
  "Initial schema for annual park memberships: member records, pass types, expiry, recurring billing hooks.\n\nSee \`planning/backlog.yaml\` (E17/OP-76)."

echo ""
echo "=== Done! Issue map saved to /tmp/op-issue-map.txt ==="
cat /tmp/op-issue-map.txt

echo ""
echo "=== Next: Set up GitHub Project board ==="
echo "  1. Go to https://github.com/mikesassatelli/offroad-parks/projects"
echo "  2. New project → Board → name it 'Offroad Parks Roadmap'"
echo "  3. Columns: Backlog | Sprint Candidate | In Progress | In Review | Done"
echo "  4. Add all issues to the board"
