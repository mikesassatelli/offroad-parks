-- CreateEnum
CREATE TYPE "ParkAlertSeverity" AS ENUM ('INFO', 'WARNING', 'DANGER', 'SUCCESS');

-- CreateTable
CREATE TABLE "ParkAlert" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "severity" "ParkAlertSeverity" NOT NULL DEFAULT 'INFO',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParkAlert_parkId_isActive_idx" ON "ParkAlert"("parkId", "isActive");

-- CreateIndex
CREATE INDEX "ParkAlert_expiresAt_idx" ON "ParkAlert"("expiresAt");

-- AddForeignKey
ALTER TABLE "ParkAlert" ADD CONSTRAINT "ParkAlert_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkAlert" ADD CONSTRAINT "ParkAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
