-- CreateTable
CREATE TABLE "OffboardingCase" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,

    CONSTRAINT "OffboardingCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingTask" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,

    CONSTRAINT "OffboardingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoveOutCharge" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "responsibility" "ChargeResponsibility" NOT NULL,
    "sourceInspectionItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoveOutCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositSettlement" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "depositHeldCents" INTEGER NOT NULL,
    "chargesAppliedCents" INTEGER NOT NULL,
    "refundDueCents" INTEGER NOT NULL,
    "balanceOwedCents" INTEGER NOT NULL,
    "statementKey" TEXT,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "DepositSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OffboardingCase_leaseId_key" ON "OffboardingCase"("leaseId");

-- CreateIndex
CREATE INDEX "OffboardingCase_orgId_status_idx" ON "OffboardingCase"("orgId", "status");

-- CreateIndex
CREATE INDEX "OffboardingTask_caseId_orderIndex_idx" ON "OffboardingTask"("caseId", "orderIndex");

-- CreateIndex
CREATE INDEX "MoveOutCharge_caseId_idx" ON "MoveOutCharge"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "DepositSettlement_caseId_key" ON "DepositSettlement"("caseId");

-- AddForeignKey
ALTER TABLE "OffboardingCase" ADD CONSTRAINT "OffboardingCase_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingCase" ADD CONSTRAINT "OffboardingCase_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingTask" ADD CONSTRAINT "OffboardingTask_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "OffboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveOutCharge" ADD CONSTRAINT "MoveOutCharge_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "OffboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositSettlement" ADD CONSTRAINT "DepositSettlement_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "OffboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
