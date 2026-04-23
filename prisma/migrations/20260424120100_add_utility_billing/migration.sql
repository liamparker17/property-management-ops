-- CreateEnum
CREATE TYPE "UtilityType" AS ENUM ('WATER', 'ELECTRICITY', 'GAS', 'SEWER', 'REFUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "MeterReadingSource" AS ENUM ('MANUAL', 'IMPORT', 'ESTIMATED', 'ROLLOVER');

-- CreateEnum
CREATE TYPE "TariffStructure" AS ENUM ('FLAT', 'TIERED');

-- CreateTable
CREATE TABLE "Meter" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "UtilityType" NOT NULL,
    "serial" TEXT,
    "installedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meter_orgId_unitId_type_idx" ON "Meter"("orgId", "unitId", "type");

-- CreateTable
CREATE TABLE "MeterReading" (
    "id" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "readingValue" DECIMAL(65,30) NOT NULL,
    "source" "MeterReadingSource" NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeterReading_meterId_takenAt_key" ON "MeterReading"("meterId", "takenAt");

-- CreateIndex
CREATE INDEX "MeterReading_meterId_takenAt_idx" ON "MeterReading"("meterId", "takenAt");

-- CreateTable
CREATE TABLE "UtilityTariff" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "propertyId" TEXT,
    "type" "UtilityType" NOT NULL,
    "structure" "TariffStructure" NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "flatUnitRateCents" INTEGER,
    "tieredJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtilityTariff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UtilityTariff_orgId_type_effectiveFrom_idx" ON "UtilityTariff"("orgId", "type", "effectiveFrom");

-- CreateIndex
CREATE INDEX "UtilityTariff_propertyId_idx" ON "UtilityTariff"("propertyId");

-- CreateTable
CREATE TABLE "BillingRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "summary" JSONB,

    CONSTRAINT "BillingRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingRun_orgId_periodStart_key" ON "BillingRun"("orgId", "periodStart");

-- CreateIndex
CREATE INDEX "BillingRun_orgId_status_idx" ON "BillingRun"("orgId", "status");

-- AddForeignKey
ALTER TABLE "Meter" ADD CONSTRAINT "Meter_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meter" ADD CONSTRAINT "Meter_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "Meter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityTariff" ADD CONSTRAINT "UtilityTariff_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityTariff" ADD CONSTRAINT "UtilityTariff_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRun" ADD CONSTRAINT "BillingRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billingRunId_fkey" FOREIGN KEY ("billingRunId") REFERENCES "BillingRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
