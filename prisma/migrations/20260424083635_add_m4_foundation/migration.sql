-- CreateEnum
CREATE TYPE "AnalyticsPeriod" AS ENUM ('MONTH');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AreaNoticeType" AS ENUM ('OUTAGE', 'ESTATE', 'SECURITY', 'WATER', 'POWER', 'GENERAL');

-- CreateEnum
CREATE TYPE "OutageSource" AS ENUM ('PM', 'ESKOM_SE_PUSH');

-- AlterEnum
ALTER TYPE "IntegrationProvider" ADD VALUE 'ESKOM_SE_PUSH';

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "eskomAreaCode" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "smsOptIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMonthlySnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "occupiedUnits" INTEGER NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "vacantUnits" INTEGER NOT NULL,
    "activeLeases" INTEGER NOT NULL,
    "expiringLeases30" INTEGER NOT NULL,
    "openMaintenance" INTEGER NOT NULL,
    "blockedApprovals" INTEGER NOT NULL,
    "billedCents" INTEGER NOT NULL,
    "collectedCents" INTEGER NOT NULL,
    "arrearsCents" INTEGER NOT NULL,
    "trustBalanceCents" INTEGER NOT NULL,
    "unallocatedCents" INTEGER NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyMonthlySnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "occupiedUnits" INTEGER NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "openMaintenance" INTEGER NOT NULL,
    "arrearsCents" INTEGER NOT NULL,
    "grossRentCents" INTEGER NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyMonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandlordMonthlySnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "landlordId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "grossRentCents" INTEGER NOT NULL,
    "collectedCents" INTEGER NOT NULL,
    "disbursedCents" INTEGER NOT NULL,
    "maintenanceSpendCents" INTEGER NOT NULL,
    "vacancyDragCents" INTEGER NOT NULL,
    "trustBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandlordMonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMonthlySnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "openTickets" INTEGER NOT NULL,
    "blockedApprovals" INTEGER NOT NULL,
    "upcomingInspections" INTEGER NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaNotice" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "AreaNoticeType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "audienceQuery" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "AreaNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoticeDelivery" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageAlertRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "utilityType" "UtilityType" NOT NULL,
    "thresholdPct" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UsageAlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageAlertEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "meterId" TEXT,
    "notificationId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "observedQty" DECIMAL(65,30) NOT NULL,
    "baselineQty" DECIMAL(65,30) NOT NULL,
    "deltaPct" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageAlertEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadSheddingOutage" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "propertyId" TEXT,
    "eskomAreaCode" TEXT,
    "source" "OutageSource" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "stage" INTEGER,
    "note" TEXT,
    "externalEventId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadSheddingOutage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_lastAttemptAt_idx" ON "NotificationDelivery"("status", "lastAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMonthlySnapshot_orgId_periodStart_key" ON "OrgMonthlySnapshot"("orgId", "periodStart");

-- CreateIndex
CREATE INDEX "PropertyMonthlySnapshot_orgId_periodStart_idx" ON "PropertyMonthlySnapshot"("orgId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyMonthlySnapshot_propertyId_periodStart_key" ON "PropertyMonthlySnapshot"("propertyId", "periodStart");

-- CreateIndex
CREATE INDEX "LandlordMonthlySnapshot_orgId_periodStart_idx" ON "LandlordMonthlySnapshot"("orgId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "LandlordMonthlySnapshot_landlordId_periodStart_key" ON "LandlordMonthlySnapshot"("landlordId", "periodStart");

-- CreateIndex
CREATE INDEX "AgentMonthlySnapshot_orgId_periodStart_idx" ON "AgentMonthlySnapshot"("orgId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "AgentMonthlySnapshot_agentId_periodStart_key" ON "AgentMonthlySnapshot"("agentId", "periodStart");

-- CreateIndex
CREATE INDEX "AreaNotice_orgId_createdAt_idx" ON "AreaNotice"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AreaNotice_orgId_publishedAt_idx" ON "AreaNotice"("orgId", "publishedAt");

-- CreateIndex
CREATE INDEX "NoticeDelivery_userId_createdAt_idx" ON "NoticeDelivery"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeDelivery_noticeId_userId_channel_key" ON "NoticeDelivery"("noticeId", "userId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "UsageAlertRule_orgId_utilityType_key" ON "UsageAlertRule"("orgId", "utilityType");

-- CreateIndex
CREATE INDEX "UsageAlertEvent_orgId_periodStart_idx" ON "UsageAlertEvent"("orgId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageAlertEvent_meterId_periodStart_key" ON "UsageAlertEvent"("meterId", "periodStart");

-- CreateIndex
CREATE INDEX "LoadSheddingOutage_orgId_startsAt_idx" ON "LoadSheddingOutage"("orgId", "startsAt");

-- CreateIndex
CREATE INDEX "LoadSheddingOutage_propertyId_startsAt_idx" ON "LoadSheddingOutage"("propertyId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoadSheddingOutage_orgId_propertyId_externalEventId_key" ON "LoadSheddingOutage"("orgId", "propertyId", "externalEventId");

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMonthlySnapshot" ADD CONSTRAINT "OrgMonthlySnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMonthlySnapshot" ADD CONSTRAINT "PropertyMonthlySnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMonthlySnapshot" ADD CONSTRAINT "PropertyMonthlySnapshot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordMonthlySnapshot" ADD CONSTRAINT "LandlordMonthlySnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordMonthlySnapshot" ADD CONSTRAINT "LandlordMonthlySnapshot_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMonthlySnapshot" ADD CONSTRAINT "AgentMonthlySnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMonthlySnapshot" ADD CONSTRAINT "AgentMonthlySnapshot_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ManagingAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaNotice" ADD CONSTRAINT "AreaNotice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeDelivery" ADD CONSTRAINT "NoticeDelivery_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "AreaNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeDelivery" ADD CONSTRAINT "NoticeDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoticeDelivery" ADD CONSTRAINT "NoticeDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageAlertRule" ADD CONSTRAINT "UsageAlertRule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageAlertEvent" ADD CONSTRAINT "UsageAlertEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageAlertEvent" ADD CONSTRAINT "UsageAlertEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "UsageAlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageAlertEvent" ADD CONSTRAINT "UsageAlertEvent_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageAlertEvent" ADD CONSTRAINT "UsageAlertEvent_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageAlertEvent" ADD CONSTRAINT "UsageAlertEvent_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadSheddingOutage" ADD CONSTRAINT "LoadSheddingOutage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadSheddingOutage" ADD CONSTRAINT "LoadSheddingOutage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
