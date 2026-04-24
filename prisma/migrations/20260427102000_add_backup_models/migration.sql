-- CreateTable
CREATE TABLE "BackupSnapshot" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sizeBytes" BIGINT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "errorMessage" TEXT,
    "pgDumpVersion" TEXT,

    CONSTRAINT "BackupSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupVerificationRun" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "corruptCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "details" JSONB,

    CONSTRAINT "BackupVerificationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupSnapshot_orgId_takenAt_idx" ON "BackupSnapshot"("orgId", "takenAt");

-- CreateIndex
CREATE INDEX "BackupSnapshot_orgId_kind_takenAt_idx" ON "BackupSnapshot"("orgId", "kind", "takenAt");

-- CreateIndex
CREATE INDEX "BackupVerificationRun_orgId_startedAt_idx" ON "BackupVerificationRun"("orgId", "startedAt");

-- AddForeignKey
ALTER TABLE "BackupSnapshot" ADD CONSTRAINT "BackupSnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupVerificationRun" ADD CONSTRAINT "BackupVerificationRun_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
