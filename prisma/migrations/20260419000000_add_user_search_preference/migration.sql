-- CreateTable
CREATE TABLE "UserSearchPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSearchPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSearchPreference_userId_key" ON "UserSearchPreference"("userId");

-- CreateIndex
CREATE INDEX "UserSearchPreference_userId_idx" ON "UserSearchPreference"("userId");

-- AddForeignKey
ALTER TABLE "UserSearchPreference" ADD CONSTRAINT "UserSearchPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
