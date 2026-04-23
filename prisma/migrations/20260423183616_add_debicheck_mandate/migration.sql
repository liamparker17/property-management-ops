-- CreateEnum
CREATE TYPE "DebiCheckMandateStatus" AS ENUM ('PENDING_SIGNATURE', 'ACTIVE', 'REVOKED', 'FAILED');

-- CreateTable
CREATE TABLE "DebiCheckMandate" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mandateExternalId" TEXT,
    "upperCapCents" INTEGER NOT NULL,
    "status" "DebiCheckMandateStatus" NOT NULL DEFAULT 'PENDING_SIGNATURE',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebiCheckMandate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DebiCheckMandate_leaseId_key" ON "DebiCheckMandate"("leaseId");

-- CreateIndex
CREATE INDEX "DebiCheckMandate_orgId_status_idx" ON "DebiCheckMandate"("orgId", "status");

-- CreateIndex
CREATE INDEX "DebiCheckMandate_tenantId_idx" ON "DebiCheckMandate"("tenantId");
