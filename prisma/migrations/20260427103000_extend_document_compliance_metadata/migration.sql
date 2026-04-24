-- AlterTable
ALTER TABLE "Document"
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "retentionDays" INTEGER,
ADD COLUMN     "encryptionNote" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3);
