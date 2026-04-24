-- CreateTable
CREATE TABLE "AnnualReconciliation" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT,
    "summary" JSONB NOT NULL,
    "storageKey" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnualReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPack" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "yearId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalsJson" JSONB NOT NULL,
    "storageKey" TEXT,
    "csvKey" TEXT,
    "previousStorageKeys" JSONB NOT NULL DEFAULT '[]',
    "previousCsvKeys" JSONB NOT NULL DEFAULT '[]',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regeneratedAt" TIMESTAMP(3),
    "regenerationCount" INTEGER NOT NULL DEFAULT 0,
    "transmissionAdapter" TEXT NOT NULL DEFAULT 'recordOnly',
    "transmissionResult" JSONB,

    CONSTRAINT "TaxPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxPackLine" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "amountCents" INTEGER NOT NULL,
    "evidenceRefs" JSONB,

    CONSTRAINT "TaxPackLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnualReconciliation_orgId_yearId_idx" ON "AnnualReconciliation"("orgId", "yearId");

-- CreateIndex
CREATE INDEX "AnnualReconciliation_orgId_scopeType_scopeId_idx" ON "AnnualReconciliation"("orgId", "scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxPack_orgId_yearId_subjectType_subjectId_key" ON "TaxPack"("orgId", "yearId", "subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "TaxPackLine_packId_category_idx" ON "TaxPackLine"("packId", "category");

-- AddForeignKey
ALTER TABLE "AnnualReconciliation" ADD CONSTRAINT "AnnualReconciliation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualReconciliation" ADD CONSTRAINT "AnnualReconciliation_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "FinancialYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxPack" ADD CONSTRAINT "TaxPack_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxPack" ADD CONSTRAINT "TaxPack_yearId_fkey" FOREIGN KEY ("yearId") REFERENCES "FinancialYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxPackLine" ADD CONSTRAINT "TaxPackLine_packId_fkey" FOREIGN KEY ("packId") REFERENCES "TaxPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
