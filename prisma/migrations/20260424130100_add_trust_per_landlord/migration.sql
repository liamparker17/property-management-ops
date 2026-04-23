-- CreateTable
CREATE TABLE "TrustAccount" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankRef" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustLedgerEntry" (
    "id" TEXT NOT NULL,
    "trustAccountId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "tenantId" TEXT,
    "leaseId" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrustAccount_landlordId_idx" ON "TrustAccount"("landlordId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustAccount_orgId_landlordId_key" ON "TrustAccount"("orgId", "landlordId");

-- CreateIndex
CREATE INDEX "TrustLedgerEntry_trustAccountId_occurredAt_idx" ON "TrustLedgerEntry"("trustAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrustLedgerEntry_trustAccountId_tenantId_idx" ON "TrustLedgerEntry"("trustAccountId", "tenantId");

-- CreateIndex
CREATE INDEX "TrustLedgerEntry_landlordId_occurredAt_idx" ON "TrustLedgerEntry"("landlordId", "occurredAt");

-- CreateIndex
CREATE INDEX "TrustLedgerEntry_sourceType_sourceId_idx" ON "TrustLedgerEntry"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "TrustAccount" ADD CONSTRAINT "TrustAccount_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustAccount" ADD CONSTRAINT "TrustAccount_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustLedgerEntry" ADD CONSTRAINT "TrustLedgerEntry_trustAccountId_fkey" FOREIGN KEY ("trustAccountId") REFERENCES "TrustAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustLedgerEntry" ADD CONSTRAINT "TrustLedgerEntry_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustLedgerEntry" ADD CONSTRAINT "TrustLedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustLedgerEntry" ADD CONSTRAINT "TrustLedgerEntry_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
