-- CreateTable
CREATE TABLE "UserPreGrant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "grantRole" "UserRole",
    "operatorParkSlug" TEXT,
    "notes" TEXT,
    "appliedAt" TIMESTAMP(3),
    "appliedToUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreGrant_email_key" ON "UserPreGrant"("email");

-- CreateIndex
CREATE INDEX "UserPreGrant_email_idx" ON "UserPreGrant"("email");

-- Seed: pre-grant for the initial beta tester clemenlarryj@gmail.com.
-- On their first sign-in the NextAuth events.createUser hook will:
--   1. set their User.role = ADMIN
--   2. wire them as the OWNER of the operator account on
--      gypsum-city-ohv-park-iowa (creating the Operator record if needed)
-- Idempotent via ON CONFLICT — re-deploys are safe.
INSERT INTO "UserPreGrant" (
    "id", "email", "grantRole", "operatorParkSlug", "notes", "createdAt"
) VALUES (
    'pregrant_seed_clemenlarryj',
    'clemenlarryj@gmail.com',
    'ADMIN',
    'gypsum-city-ohv-park-iowa',
    'Beta tester — pre-granted ADMIN + operator of Gypsum City OHV Park on first sign-in.',
    NOW()
)
ON CONFLICT ("email") DO NOTHING;
