-- CreateEnum
CREATE TYPE "ReviewRequestStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'RESOLVED');

-- CreateTable
CREATE TABLE "LeaseSignature" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "signedName" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationText" TEXT,

    CONSTRAINT "LeaseSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseReviewRequest" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clauseExcerpt" TEXT NOT NULL,
    "tenantNote" TEXT NOT NULL,
    "pmResponse" TEXT,
    "status" "ReviewRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "LeaseReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaseSignature_leaseId_idx" ON "LeaseSignature"("leaseId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseSignature_leaseId_tenantId_key" ON "LeaseSignature"("leaseId", "tenantId");

-- CreateIndex
CREATE INDEX "LeaseReviewRequest_leaseId_status_idx" ON "LeaseReviewRequest"("leaseId", "status");

-- AddForeignKey
ALTER TABLE "LeaseSignature" ADD CONSTRAINT "LeaseSignature_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseReviewRequest" ADD CONSTRAINT "LeaseReviewRequest_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
