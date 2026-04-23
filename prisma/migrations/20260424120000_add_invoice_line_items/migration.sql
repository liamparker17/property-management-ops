-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'DRAFT';

-- CreateEnum
CREATE TYPE "InvoiceLineItemKind" AS ENUM ('RENT', 'UTILITY_WATER', 'UTILITY_ELECTRICITY', 'UTILITY_GAS', 'UTILITY_SEWER', 'UTILITY_REFUSE', 'ADJUSTMENT', 'LATE_FEE', 'DEPOSIT_CHARGE');

-- AlterTable
ALTER TABLE "Invoice"
    ADD COLUMN "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "taxCents" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "totalCents" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "billingRunId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_billingRunId_idx" ON "Invoice"("billingRunId");

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" "InvoiceLineItemKind" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30),
    "unitRateCents" INTEGER,
    "amountCents" INTEGER NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "estimated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
