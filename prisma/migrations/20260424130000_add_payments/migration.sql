-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFT', 'CASH', 'CHEQUE', 'CARD_MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceiptSource" AS ENUM ('MANUAL', 'CSV_IMPORT', 'STITCH', 'DEBICHECK');

-- CreateEnum
CREATE TYPE "AllocationTarget" AS ENUM ('INVOICE_LINE_ITEM', 'DEPOSIT', 'LATE_FEE', 'UNAPPLIED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('RECEIPT', 'DISBURSEMENT', 'ALLOCATION', 'REVERSAL', 'DEPOSIT_IN', 'DEPOSIT_OUT', 'FEE');

-- CreateEnum
CREATE TYPE "StatementType" AS ENUM ('TENANT', 'LANDLORD', 'TRUST');

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tenantId" TEXT,
    "leaseId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "source" "ReceiptSource" NOT NULL,
    "externalRef" TEXT,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "target" "AllocationTarget" NOT NULL,
    "invoiceLineItemId" TEXT,
    "depositLeaseId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReceipt_orgId_receivedAt_idx" ON "PaymentReceipt"("orgId", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentReceipt_orgId_tenantId_idx" ON "PaymentReceipt"("orgId", "tenantId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_orgId_externalRef_idx" ON "PaymentReceipt"("orgId", "externalRef");

-- CreateIndex
CREATE INDEX "Allocation_receiptId_idx" ON "Allocation"("receiptId");

-- CreateIndex
CREATE INDEX "Allocation_invoiceLineItemId_idx" ON "Allocation"("invoiceLineItemId");

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PaymentReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_invoiceLineItemId_fkey" FOREIGN KEY ("invoiceLineItemId") REFERENCES "InvoiceLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_depositLeaseId_fkey" FOREIGN KEY ("depositLeaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;
