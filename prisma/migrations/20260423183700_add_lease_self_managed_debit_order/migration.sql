-- AlterTable
ALTER TABLE "Lease" ADD COLUMN IF NOT EXISTS "selfManagedDebitOrderActive" BOOLEAN NOT NULL DEFAULT false;
