-- CreateEnum
CREATE TYPE "OrgOwnerType" AS ENUM ('PM_AGENCY', 'LANDLORD_DIRECT');

-- CreateEnum
CREATE TYPE "ApprovalKind" AS ENUM ('MAINTENANCE_COMMIT', 'LEASE_CREATE', 'LEASE_RENEW', 'RENT_CHANGE', 'TENANT_EVICT', 'PROPERTY_REMOVE');

-- CreateEnum
CREATE TYPE "ApprovalState" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'LANDLORD';
ALTER TYPE "Role" ADD VALUE 'MANAGING_AGENT';

-- AlterTable
ALTER TABLE "Org" ADD COLUMN     "landlordApprovalThresholdCents" INTEGER NOT NULL DEFAULT 500000,
ADD COLUMN     "ownerType" "OrgOwnerType" NOT NULL DEFAULT 'PM_AGENCY';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "landlordId" TEXT,
ADD COLUMN     "managingAgentId" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "assignedAgentId" TEXT,
ADD COLUMN     "landlordId" TEXT;

-- CreateTable
CREATE TABLE "Landlord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "vatNumber" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Landlord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagingAgent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagingAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "propertyId" TEXT,
    "kind" "ApprovalKind" NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "payload" JSONB NOT NULL,
    "state" "ApprovalState" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "decisionNote" TEXT,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Landlord_orgId_name_idx" ON "Landlord"("orgId", "name");

-- CreateIndex
CREATE INDEX "Landlord_orgId_archivedAt_idx" ON "Landlord"("orgId", "archivedAt");

-- CreateIndex
CREATE INDEX "ManagingAgent_orgId_name_idx" ON "ManagingAgent"("orgId", "name");

-- CreateIndex
CREATE INDEX "ManagingAgent_orgId_archivedAt_idx" ON "ManagingAgent"("orgId", "archivedAt");

-- CreateIndex
CREATE INDEX "Approval_orgId_state_idx" ON "Approval"("orgId", "state");

-- CreateIndex
CREATE INDEX "Approval_landlordId_state_idx" ON "Approval"("landlordId", "state");

-- CreateIndex
CREATE INDEX "Approval_subjectType_subjectId_idx" ON "Approval"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "User_landlordId_idx" ON "User"("landlordId");

-- CreateIndex
CREATE INDEX "User_managingAgentId_idx" ON "User"("managingAgentId");

-- CreateIndex
CREATE INDEX "Property_landlordId_idx" ON "Property"("landlordId");

-- CreateIndex
CREATE INDEX "Property_assignedAgentId_idx" ON "Property"("assignedAgentId");

-- AddForeignKey
ALTER TABLE "Landlord" ADD CONSTRAINT "Landlord_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagingAgent" ADD CONSTRAINT "ManagingAgent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managingAgentId_fkey" FOREIGN KEY ("managingAgentId") REFERENCES "ManagingAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "ManagingAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
