-- CreateTable
CREATE TABLE "FinancialYear" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,

    CONSTRAINT "FinancialYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYear_orgId_startDate_key" ON "FinancialYear"("orgId", "startDate");

-- CreateIndex
CREATE INDEX "FinancialYear_orgId_lockedAt_idx" ON "FinancialYear"("orgId", "lockedAt");

-- AddForeignKey
ALTER TABLE "FinancialYear" ADD CONSTRAINT "FinancialYear_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialYear" ADD CONSTRAINT "FinancialYear_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
