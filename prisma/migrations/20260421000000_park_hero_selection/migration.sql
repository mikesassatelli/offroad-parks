-- CreateEnum
CREATE TYPE "HeroSource" AS ENUM ('AUTO', 'PHOTO', 'MAP');

-- AlterTable
ALTER TABLE "Park" ADD COLUMN     "heroPhotoId" TEXT,
ADD COLUMN     "heroSource" "HeroSource" NOT NULL DEFAULT 'AUTO';

-- CreateIndex
CREATE UNIQUE INDEX "Park_heroPhotoId_key" ON "Park"("heroPhotoId");

-- AddForeignKey
ALTER TABLE "Park" ADD CONSTRAINT "Park_heroPhotoId_fkey" FOREIGN KEY ("heroPhotoId") REFERENCES "ParkPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
