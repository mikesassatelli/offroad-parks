-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "ParkStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DRAFT');

-- CreateEnum
CREATE TYPE "Terrain" AS ENUM ('sand', 'rocks', 'mud', 'trails', 'hills', 'motocrossTrack');

-- CreateEnum
CREATE TYPE "Amenity" AS ENUM ('restrooms', 'showers', 'food', 'fuel', 'repair', 'boatRamp', 'loadingRamp', 'picnicTable', 'shelter', 'grill', 'playground', 'wifi', 'fishing', 'airStation', 'trailMaps', 'rentals', 'training', 'firstAid', 'store');

-- CreateEnum
CREATE TYPE "Camping" AS ENUM ('tent', 'rv30A', 'rv50A', 'fullHookup', 'cabin', 'groupSite', 'backcountry');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('motorcycle', 'atv', 'sxs', 'fullSize');

-- CreateEnum
CREATE TYPE "Ownership" AS ENUM ('private', 'public', 'mixed', 'unknown');

-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('NEEDS_RESEARCH', 'IN_PROGRESS', 'RESEARCHED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('website', 'pdf', 'facebook', 'governmentPage', 'reviewSite', 'campingDirectory', 'other');

-- CreateEnum
CREATE TYPE "DataSourceOrigin" AS ENUM ('OPERATOR_PROVIDED', 'AI_DISCOVERED', 'ADMIN_ADDED', 'USER_SUBMITTED');

-- CreateEnum
CREATE TYPE "CrawlStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ROBOTS_BLOCKED', 'SKIPPED', 'WRONG_PARK');

-- CreateEnum
CREATE TYPE "FieldConfidence" AS ENUM ('OPERATOR_CONFIRMED', 'HUMAN_VERIFIED', 'AI_EXTRACTED', 'USER_SUBMITTED', 'AI_INFERRED', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "FieldExtractionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "ResearchTrigger" AS ENUM ('SCHEDULED_CRON', 'ADMIN_MANUAL', 'OPERATOR_SOURCES', 'NEW_PARK_SEEDED', 'SOURCE_CHANGED');

-- CreateEnum
CREATE TYPE "ResearchSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "VisitCondition" AS ENUM ('dry', 'muddy', 'snow', 'wet', 'mixed');

-- CreateEnum
CREATE TYPE "RecommendedDuration" AS ENUM ('quickRide', 'halfDay', 'fullDay', 'overnight');

-- CreateEnum
CREATE TYPE "TrailConditionStatus" AS ENUM ('OPEN', 'CLOSED', 'CAUTION', 'MUDDY', 'WET', 'SNOW');

-- CreateEnum
CREATE TYPE "ConditionReportStatus" AS ENUM ('PUBLISHED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ParkCandidateStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Park" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "website" TEXT,
    "phone" TEXT,
    "campingWebsite" TEXT,
    "campingPhone" TEXT,
    "isFree" BOOLEAN,
    "dayPassUSD" DOUBLE PRECISION,
    "vehicleEntryFeeUSD" DOUBLE PRECISION,
    "riderFeeUSD" DOUBLE PRECISION,
    "membershipFeeUSD" DOUBLE PRECISION,
    "milesOfTrails" INTEGER,
    "acres" INTEGER,
    "notes" TEXT,
    "status" "ParkStatus" NOT NULL DEFAULT 'PENDING',
    "datesOpen" TEXT,
    "contactEmail" TEXT,
    "ownership" "Ownership",
    "permitRequired" BOOLEAN,
    "permitType" TEXT,
    "membershipRequired" BOOLEAN,
    "maxVehicleWidthInches" INTEGER,
    "flagsRequired" BOOLEAN,
    "sparkArrestorRequired" BOOLEAN,
    "helmetsRequired" BOOLEAN,
    "noiseLimitDBA" INTEGER,
    "mapHeroUrl" TEXT,
    "mapHeroGeneratedAt" TIMESTAMP(3),
    "averageRating" DOUBLE PRECISION,
    "averageDifficulty" DOUBLE PRECISION,
    "averageTerrain" DOUBLE PRECISION,
    "averageFacilities" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "averageRecommendedStay" "RecommendedDuration",
    "submitterId" TEXT,
    "submitterName" TEXT,
    "operatorId" TEXT,
    "dataCompletenessScore" DOUBLE PRECISION,
    "lastResearchedAt" TIMESTAMP(3),
    "researchPriority" INTEGER NOT NULL DEFAULT 50,
    "researchStatus" "ResearchStatus" NOT NULL DEFAULT 'NEEDS_RESEARCH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Park_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkTerrain" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "terrain" "Terrain" NOT NULL,

    CONSTRAINT "ParkTerrain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkAmenity" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "amenity" "Amenity" NOT NULL,

    CONSTRAINT "ParkAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkCamping" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "camping" "Camping" NOT NULL,

    CONSTRAINT "ParkCamping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkVehicleType" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,

    CONSTRAINT "ParkVehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "streetAddress" TEXT,
    "streetAddress2" TEXT,
    "city" TEXT,
    "state" TEXT NOT NULL,
    "zipCode" TEXT,
    "county" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkPhoto" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "status" "PhotoStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkReview" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "terrainRating" INTEGER NOT NULL,
    "facilitiesRating" INTEGER NOT NULL,
    "difficultyRating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3),
    "vehicleType" "VehicleType",
    "visitCondition" "VisitCondition",
    "recommendedDuration" "RecommendedDuration",
    "recommendedFor" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrailCondition" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TrailConditionStatus" NOT NULL,
    "note" TEXT,
    "reportStatus" "ConditionReportStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isOperatorPost" BOOLEAN NOT NULL DEFAULT false,
    "pinnedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewHelpfulVote" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewHelpfulVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'STANDARD',
    "trialEndsAt" TIMESTAMP(3),
    "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorUser" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkClaim" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "claimantName" TEXT NOT NULL,
    "claimantEmail" TEXT NOT NULL,
    "claimantPhone" TEXT,
    "businessName" TEXT,
    "message" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkEditLog" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParkEditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSearchPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSearchPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "shareToken" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "waypoints" JSONB NOT NULL,
    "routeGeometry" JSONB,
    "totalDistanceMi" DOUBLE PRECISION,
    "estimatedDurationMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL DEFAULT 'website',
    "origin" "DataSourceOrigin" NOT NULL DEFAULT 'AI_DISCOVERED',
    "title" TEXT,
    "description" TEXT,
    "reliability" INTEGER NOT NULL DEFAULT 50,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "lastCrawledAt" TIMESTAMP(3),
    "lastContentHash" TEXT,
    "contentChanged" BOOLEAN NOT NULL DEFAULT false,
    "crawlStatus" "CrawlStatus" NOT NULL DEFAULT 'PENDING',
    "crawlError" TEXT,
    "robotsOverride" BOOLEAN NOT NULL DEFAULT false,
    "approveCount" INTEGER NOT NULL DEFAULT 0,
    "rejectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldExtraction" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "extractedValue" TEXT,
    "confidence" "FieldConfidence" NOT NULL DEFAULT 'AI_EXTRACTED',
    "confidenceScore" DOUBLE PRECISION,
    "status" "FieldExtractionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "sourcesChecked" INTEGER NOT NULL DEFAULT 0,
    "dataSourceId" TEXT,
    "sessionId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSession" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "trigger" "ResearchTrigger" NOT NULL,
    "status" "ResearchSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "fieldsExtracted" INTEGER NOT NULL DEFAULT 0,
    "fieldsApplied" INTEGER NOT NULL DEFAULT 0,
    "sourcesFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "summary" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSessionSource" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,

    CONSTRAINT "ResearchSessionSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainReliability" (
    "id" TEXT NOT NULL,
    "domainPattern" TEXT NOT NULL,
    "defaultReliability" INTEGER NOT NULL DEFAULT 50,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainReliability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkCandidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT,
    "estimatedLat" DOUBLE PRECISION,
    "estimatedLng" DOUBLE PRECISION,
    "sourceUrl" TEXT,
    "status" "ParkCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedReason" TEXT,
    "seededParkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Park_slug_key" ON "Park"("slug");

-- CreateIndex
CREATE INDEX "Park_status_idx" ON "Park"("status");

-- CreateIndex
CREATE INDEX "Park_averageRating_idx" ON "Park"("averageRating");

-- CreateIndex
CREATE INDEX "Park_researchStatus_idx" ON "Park"("researchStatus");

-- CreateIndex
CREATE INDEX "Park_researchPriority_idx" ON "Park"("researchPriority");

-- CreateIndex
CREATE UNIQUE INDEX "ParkTerrain_parkId_terrain_key" ON "ParkTerrain"("parkId", "terrain");

-- CreateIndex
CREATE UNIQUE INDEX "ParkAmenity_parkId_amenity_key" ON "ParkAmenity"("parkId", "amenity");

-- CreateIndex
CREATE UNIQUE INDEX "ParkCamping_parkId_camping_key" ON "ParkCamping"("parkId", "camping");

-- CreateIndex
CREATE UNIQUE INDEX "ParkVehicleType_parkId_vehicleType_key" ON "ParkVehicleType"("parkId", "vehicleType");

-- CreateIndex
CREATE UNIQUE INDEX "Address_parkId_key" ON "Address"("parkId");

-- CreateIndex
CREATE INDEX "Address_state_idx" ON "Address"("state");

-- CreateIndex
CREATE INDEX "UserFavorite_userId_idx" ON "UserFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavorite_userId_parkId_key" ON "UserFavorite"("userId", "parkId");

-- CreateIndex
CREATE INDEX "ParkPhoto_parkId_idx" ON "ParkPhoto"("parkId");

-- CreateIndex
CREATE INDEX "ParkPhoto_userId_idx" ON "ParkPhoto"("userId");

-- CreateIndex
CREATE INDEX "ParkPhoto_status_idx" ON "ParkPhoto"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ParkPhoto_url_key" ON "ParkPhoto"("url");

-- CreateIndex
CREATE INDEX "ParkReview_parkId_idx" ON "ParkReview"("parkId");

-- CreateIndex
CREATE INDEX "ParkReview_userId_idx" ON "ParkReview"("userId");

-- CreateIndex
CREATE INDEX "ParkReview_status_idx" ON "ParkReview"("status");

-- CreateIndex
CREATE INDEX "ParkReview_createdAt_idx" ON "ParkReview"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParkReview_userId_parkId_key" ON "ParkReview"("userId", "parkId");

-- CreateIndex
CREATE INDEX "TrailCondition_parkId_idx" ON "TrailCondition"("parkId");

-- CreateIndex
CREATE INDEX "TrailCondition_userId_idx" ON "TrailCondition"("userId");

-- CreateIndex
CREATE INDEX "TrailCondition_reportStatus_idx" ON "TrailCondition"("reportStatus");

-- CreateIndex
CREATE INDEX "TrailCondition_createdAt_idx" ON "TrailCondition"("createdAt");

-- CreateIndex
CREATE INDEX "ReviewHelpfulVote_reviewId_idx" ON "ReviewHelpfulVote"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewHelpfulVote_userId_reviewId_key" ON "ReviewHelpfulVote"("userId", "reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_stripeCustomerId_key" ON "Operator"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_stripeSubscriptionId_key" ON "Operator"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Operator_stripeCustomerId_idx" ON "Operator"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Operator_subscriptionStatus_idx" ON "Operator"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "OperatorUser_userId_idx" ON "OperatorUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorUser_operatorId_userId_key" ON "OperatorUser"("operatorId", "userId");

-- CreateIndex
CREATE INDEX "ParkClaim_status_idx" ON "ParkClaim"("status");

-- CreateIndex
CREATE INDEX "ParkClaim_parkId_idx" ON "ParkClaim"("parkId");

-- CreateIndex
CREATE INDEX "ParkClaim_userId_idx" ON "ParkClaim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParkClaim_parkId_userId_key" ON "ParkClaim"("parkId", "userId");

-- CreateIndex
CREATE INDEX "ParkEditLog_parkId_idx" ON "ParkEditLog"("parkId");

-- CreateIndex
CREATE INDEX "ParkEditLog_userId_idx" ON "ParkEditLog"("userId");

-- CreateIndex
CREATE INDEX "ParkEditLog_createdAt_idx" ON "ParkEditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserSearchPreference_userId_key" ON "UserSearchPreference"("userId");

-- CreateIndex
CREATE INDEX "UserSearchPreference_userId_idx" ON "UserSearchPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_shareToken_key" ON "Route"("shareToken");

-- CreateIndex
CREATE INDEX "DataSource_parkId_idx" ON "DataSource"("parkId");

-- CreateIndex
CREATE INDEX "DataSource_crawlStatus_idx" ON "DataSource"("crawlStatus");

-- CreateIndex
CREATE INDEX "DataSource_lastCrawledAt_idx" ON "DataSource"("lastCrawledAt");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_parkId_url_key" ON "DataSource"("parkId", "url");

-- CreateIndex
CREATE INDEX "FieldExtraction_parkId_fieldName_idx" ON "FieldExtraction"("parkId", "fieldName");

-- CreateIndex
CREATE INDEX "FieldExtraction_status_idx" ON "FieldExtraction"("status");

-- CreateIndex
CREATE INDEX "FieldExtraction_parkId_fieldName_status_idx" ON "FieldExtraction"("parkId", "fieldName", "status");

-- CreateIndex
CREATE INDEX "ResearchSession_parkId_idx" ON "ResearchSession"("parkId");

-- CreateIndex
CREATE INDEX "ResearchSession_status_idx" ON "ResearchSession"("status");

-- CreateIndex
CREATE INDEX "ResearchSession_createdAt_idx" ON "ResearchSession"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchSessionSource_sessionId_dataSourceId_key" ON "ResearchSessionSource"("sessionId", "dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainReliability_domainPattern_key" ON "DomainReliability"("domainPattern");

-- CreateIndex
CREATE INDEX "ParkCandidate_status_idx" ON "ParkCandidate"("status");

-- CreateIndex
CREATE INDEX "ParkCandidate_state_idx" ON "ParkCandidate"("state");

-- CreateIndex
CREATE UNIQUE INDEX "ParkCandidate_name_state_key" ON "ParkCandidate"("name", "state");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Park" ADD CONSTRAINT "Park_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Park" ADD CONSTRAINT "Park_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkTerrain" ADD CONSTRAINT "ParkTerrain_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkAmenity" ADD CONSTRAINT "ParkAmenity_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkCamping" ADD CONSTRAINT "ParkCamping_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkVehicleType" ADD CONSTRAINT "ParkVehicleType_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkPhoto" ADD CONSTRAINT "ParkPhoto_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkPhoto" ADD CONSTRAINT "ParkPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkReview" ADD CONSTRAINT "ParkReview_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkReview" ADD CONSTRAINT "ParkReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailCondition" ADD CONSTRAINT "TrailCondition_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailCondition" ADD CONSTRAINT "TrailCondition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHelpfulVote" ADD CONSTRAINT "ReviewHelpfulVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ParkReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHelpfulVote" ADD CONSTRAINT "ReviewHelpfulVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorUser" ADD CONSTRAINT "OperatorUser_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorUser" ADD CONSTRAINT "OperatorUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkClaim" ADD CONSTRAINT "ParkClaim_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkClaim" ADD CONSTRAINT "ParkClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkEditLog" ADD CONSTRAINT "ParkEditLog_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkEditLog" ADD CONSTRAINT "ParkEditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSearchPreference" ADD CONSTRAINT "UserSearchPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldExtraction" ADD CONSTRAINT "FieldExtraction_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldExtraction" ADD CONSTRAINT "FieldExtraction_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldExtraction" ADD CONSTRAINT "FieldExtraction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ResearchSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSession" ADD CONSTRAINT "ResearchSession_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSessionSource" ADD CONSTRAINT "ResearchSessionSource_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ResearchSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSessionSource" ADD CONSTRAINT "ResearchSessionSource_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

