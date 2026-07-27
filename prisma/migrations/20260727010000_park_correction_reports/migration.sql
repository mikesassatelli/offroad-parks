-- CreateEnum
CREATE TYPE "CorrectionReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "ParkCorrectionReport" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" "CorrectionReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParkCorrectionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParkCorrectionReport_parkId_idx" ON "ParkCorrectionReport"("parkId");

-- CreateIndex
CREATE INDEX "ParkCorrectionReport_status_idx" ON "ParkCorrectionReport"("status");

-- AddForeignKey
ALTER TABLE "ParkCorrectionReport" ADD CONSTRAINT "ParkCorrectionReport_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkCorrectionReport" ADD CONSTRAINT "ParkCorrectionReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
