# Codebase Manifest — Property Management Ops

> **This is the LLM source of truth.** Check here BEFORE reading any file.
> Last updated: 2026-04-24 (M2 — Itemised billing, payments, trust, statements)

> Refresh note: 2026-04-24 M5 landed — year-end reporting, tax packs, backup & DR.

## Stack

Next.js 16.2 | React 19 | TypeScript strict | Prisma 7 + Neon Postgres | NextAuth v5 (JWT/Credentials) | Tailwind 4 + shadcn | Recharts | React-Leaflet + Leaflet | Vercel Blob | Zod 4

## Environment Variables (.env.local)

| Var | Purpose |
|-----|---------|
| DATABASE_URL | Neon pooled connection string |
| DIRECT_URL | Neon direct connection (migrations) |
| NEXTAUTH_SECRET | JWT signing secret |
| BLOB_READ_WRITE_TOKEN | Vercel Blob access |
| SENTRY_DSN | Error tracking (optional) |
| EXPIRING_WINDOW_DAYS | Lease expiry warning threshold |
| AUTH_TRUST_HOST | Trust proxy host header (Vercel) |
| SMTP_HOST | Shared SMTP host for outbound email (e.g. `smtp.gmail.com`, `smtp.office365.com`) |
| SMTP_PORT | Shared SMTP port (commonly `587` for STARTTLS or `465` for implicit TLS) |
| SMTP_SECURE | Shared SMTP transport security toggle (`true` for implicit TLS, `false` for STARTTLS) |
| SMTP_USER | Shared SMTP username used by named mailboxes unless overridden per mailbox |
| SMTP_PASSWORD | Shared SMTP password / app password used by named mailboxes unless overridden |
| GMAIL_USER | Legacy Gmail / Google Workspace username fallback when `SMTP_*` is unset |
| GMAIL_APP_PASSWORD | Gmail App Password (16 chars) — generate at myaccount.google.com/apppasswords with 2FA on |
| EMAIL_FROM_NAME | Default display name in From header (default `"Regalis"`) |
| EMAIL_FROM | Optional explicit default From override (default `"EMAIL_FROM_NAME <SMTP_USER>"`) |
| EMAIL_REPLY_TO | Optional default reply-to address |
| EMAIL_NOREPLY_FROM | Optional From header for transactional/system email (tenant invites, future automations) |
| EMAIL_NOREPLY_REPLY_TO | Optional reply-to for the `noreply` mailbox (can point to `updates@...`) |
| EMAIL_NOREPLY_SMTP_HOST | Optional SMTP host override for the `noreply` mailbox |
| EMAIL_NOREPLY_SMTP_PORT | Optional SMTP port override for the `noreply` mailbox |
| EMAIL_NOREPLY_SMTP_SECURE | Optional SMTP security override for the `noreply` mailbox |
| EMAIL_NOREPLY_SMTP_USER | Optional SMTP username override for the `noreply` mailbox |
| EMAIL_NOREPLY_SMTP_PASSWORD | Optional SMTP password override for the `noreply` mailbox |
| EMAIL_UPDATES_FROM | Optional From header for public contact, signup, and ops-style email |
| EMAIL_UPDATES_REPLY_TO | Optional reply-to for the `updates` mailbox |
| EMAIL_UPDATES_SMTP_HOST | Optional SMTP host override for the `updates` mailbox |
| EMAIL_UPDATES_SMTP_PORT | Optional SMTP port override for the `updates` mailbox |
| EMAIL_UPDATES_SMTP_SECURE | Optional SMTP security override for the `updates` mailbox |
| EMAIL_UPDATES_SMTP_USER | Optional SMTP username override for the `updates` mailbox |
| EMAIL_UPDATES_SMTP_PASSWORD | Optional SMTP password override for the `updates` mailbox |
| APP_URL | Base URL used in email/SMS login links; falls back to request origin |
| SMS_GATEWAY_USER | Username for SMS Gateway for Android cloud server; leave blank to disable SMS |
| SMS_GATEWAY_PASSWORD | Password for SMS Gateway for Android cloud server |
| SMS_GATEWAY_URL | Optional override endpoint for self-hosted / private SMS server (default is the public cloud URL) |
| OPS_SMS_RECIPIENTS | Comma-separated E.164 numbers that receive PM-side alerts (new maintenance, lease signings, clause reviews) |
| OPS_EMAIL_RECIPIENTS | Comma-separated addresses that receive PM-side email alerts (public contact + signup-request notifications in `lib/email.ts`); falls back to the configured `updates` mailbox when blank |
| INTEGRATION_SECRET_KEY | 32-byte hex key for AES-256-GCM cipher on `OrgIntegration` token fields (read by `lib/crypto.ts`) |
| STITCH_PARTNER_ID | White-label partner id in the Stitch Connect onboarding URL |
| STITCH_WEBHOOK_SECRET | HMAC secret used by Stitch adapters to verify inbound webhook signatures |
| STITCH_REDIRECT_URI | OAuth callback for the Stitch Connect flow (payments + DebiCheck + payouts) |
| ESKOM_SE_PUSH_API_BASE | Optional base URL override for the EskomSePush business API; defaults to `https://developer.sepush.co.za/business/2.0` |
| QBO_CLIENT_ID | Intuit QuickBooks Online OAuth client id; when unset, QBO adapter + reconciliation cron no-op |
| QBO_CLIENT_SECRET | Intuit QuickBooks Online OAuth client secret |
| QBO_REDIRECT_URI | OAuth callback for QBO connect flow |
| QBO_ENVIRONMENT | `sandbox` or `production` (default `sandbox`) — selects Intuit API host |
| QBO_AFFILIATE_ID | Partner/affiliate id appended to the "Sign up for QBO" referral link in the connect modal |
| BANK_REF_PREFIX | Short org prefix prepended to self-managed debit-order references (default `PMO-`); consumed by `lib/services/payments.ts` + `lib/reports/debit-order-instruction-pdf.ts` |
| BANK_NAME | Display bank name rendered on the self-managed debit-order instruction PDF (default `First National Bank`) |
| BANK_ACCOUNT_NAME | Trust account holder name on the instruction PDF (default falls back to org name) |
| BANK_ACCOUNT_NUMBER | Trust account number on the instruction PDF (default `TBC`) |
| BANK_BRANCH_CODE | Universal branch code on the instruction PDF (default `250655`) |
| BACKUP_VERIFICATION_NEON_BRANCH_URL | Optional Neon connection string for full restore verification; when unset, backup verification falls back to `pg_restore --list` schema checks |
| PG_DUMP_BIN | Optional override for the `pg_dump` binary path used by `lib/services/backup.ts` |
| BACKUP_BLOB_PREFIX | Optional Vercel Blob prefix override for backup artefacts; defaults to `backups/` |
| CRON_SECRET | Shared bearer/header secret for `/api/cron/*` routes that should reject unauthenticated invocations |

**Do NOT set NEXTAUTH_URL on Vercel** — auto-detected from VERCEL_URL.

## Database Schema (prisma/schema.prisma)

**Enums:** Role (ADMIN, PROPERTY_MANAGER, FINANCE, TENANT, LANDLORD, MANAGING_AGENT) | OrgOwnerType (PM_AGENCY, LANDLORD_DIRECT) | FeatureFlagKey (UTILITIES_BILLING, TRUST_ACCOUNTING, AREA_NOTICES, LANDLORD_APPROVALS, USAGE_ALERTS, PAYMENT_ALERTS, ANNUAL_PACKS) | ApprovalKind (MAINTENANCE_COMMIT, LEASE_CREATE, LEASE_RENEW, RENT_CHANGE, TENANT_EVICT, PROPERTY_REMOVE) | ApprovalState (PENDING, APPROVED, DECLINED, CANCELLED) | LeaseState (DRAFT, ACTIVE, TERMINATED, RENEWED) | DocumentKind (LEASE_AGREEMENT) | SAProvince (GP, WC, KZN, EC, FS, LP, MP, NW, NC) | MaintenancePriority (LOW, MEDIUM, HIGH, URGENT) | MaintenanceStatus (OPEN, IN_PROGRESS, RESOLVED, CLOSED) | InvoiceStatus (DRAFT, DUE, PAID, OVERDUE) | ReviewRequestStatus (OPEN, ACCEPTED, REJECTED, RESOLVED) | ApplicationStage (DRAFT, SUBMITTED, UNDER_REVIEW, VETTING, APPROVED, DECLINED, CONVERTED, WITHDRAWN) | ApplicationDecision (PENDING, APPROVED, DECLINED) | TpnCheckStatus (NOT_STARTED, REQUESTED, RECEIVED, FAILED, WAIVED) | TpnRecommendation (PASS, CAUTION, DECLINE, UNKNOWN) | IntegrationProvider (STITCH_PAYMENTS, STITCH_DEBICHECK, STITCH_PAYOUTS, QUICKBOOKS, TPN, ESKOM_SE_PUSH) | IntegrationStatus (DISCONNECTED, CONNECTED, ERROR) | AnalyticsPeriod (MONTH) | NotificationChannel (IN_APP, EMAIL, SMS) | NotificationStatus (QUEUED, SENT, FAILED, SKIPPED) | AreaNoticeType (OUTAGE, ESTATE, SECURITY, WATER, POWER, GENERAL) | OutageSource (PM, ESKOM_SE_PUSH) | InvoiceLineItemKind (RENT, UTILITY_WATER, UTILITY_ELECTRICITY, UTILITY_GAS, UTILITY_SEWER, UTILITY_REFUSE, ADJUSTMENT, LATE_FEE, DEPOSIT_CHARGE) | UtilityType (WATER, ELECTRICITY, GAS, SEWER, REFUSE, OTHER) | MeterReadingSource (MANUAL, IMPORT, ESTIMATED, ROLLOVER) | TariffStructure (FLAT, TIERED) | PaymentMethod (EFT, CASH, CHEQUE, CARD_MANUAL, OTHER) | ReceiptSource (MANUAL, CSV_IMPORT, STITCH, DEBICHECK) | AllocationTarget (INVOICE_LINE_ITEM, DEPOSIT, LATE_FEE, UNAPPLIED) | LedgerEntryType (RECEIPT, DISBURSEMENT, ALLOCATION, REVERSAL, DEPOSIT_IN, DEPOSIT_OUT, FEE) | StatementType (TENANT, LANDLORD, TRUST) | DebiCheckMandateStatus (PENDING_SIGNATURE, ACTIVE, REVOKED, FAILED) | InspectionType (MOVE_IN, MOVE_OUT, INTERIM) | InspectionStatus (SCHEDULED, IN_PROGRESS, COMPLETED, SIGNED_OFF, CANCELLED) | ConditionRating (EXCELLENT, GOOD, FAIR, POOR, DAMAGED) | ChargeResponsibility (LANDLORD, TENANT, SHARED)

**Models:**
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Org | name, slug, ownerType, landlordApprovalThresholdCents, expiringWindowDays | users, properties, units, tenants, leases, documents, landlords, managingAgents, approvals, orgFeatures, financialYears, annualReconciliations, taxPacks, backupSnapshots, backupVerificationRuns, auditLogs |
| OrgFeature | orgId, key, enabled, config, updatedAt | org — unique(orgId, key) |
| AuditLog | orgId, actorUserId?, entityType, entityId, action, diff?, payload?, createdAt | org, actor? |
| User | email, passwordHash, role, orgId, landlordId?, managingAgentId?, smsOptIn, disabledAt | org, landlord?, managingAgent?, accounts, sessions, documents, lockedFinancialYears, auditLogs, notifications |
| Landlord | orgId, name, email?, phone?, vatNumber?, archivedAt | org, users, properties, approvals |
| ManagingAgent | orgId, name, email?, phone?, archivedAt | org, users, assignedProperties |
| Property | name, address*, suburb, city, province, postalCode, landlordId?, assignedAgentId?, eskomAreaCode?, deletedAt | org, landlord?, assignedAgent?, units, documents, loadSheddingOutages |
| Unit | propertyId, label, bedrooms, bathrooms, sizeSqm | property, leases, documents |
| Tenant | firstName, lastName, email, phone, idNumber, userId, archivedAt | org, leases, documents |
| Lease | unitId, startDate, endDate, rentAmountCents, depositAmountCents, depositReceivedAt?, selfManagedDebitOrderActive, state, renewedFromId | unit, tenants (M2M via LeaseTenant), documents, invoices, receipts, depositAllocations, trustLedgerEntries, debiCheckMandate? |
| LeaseTenant | leaseId, tenantId, isPrimary | lease, tenant |
| Document | kind, storageKey, filename, mimeType, sizeBytes, checksum?, retentionDays?, encryptionNote?, archivedAt?, uploadedById | lease?, property?, unit?, tenant? |
| Account/Session/VerificationToken | Standard NextAuth models | |
| MaintenanceRequest | title, description, priority, status, internalNotes, resolvedAt, assignedVendorId?, estimatedCostCents?, quotedCostCents?, scheduledFor?, completedAt?, invoiceCents?, invoiceBlobKey? | org, tenant, unit, vendor?, quotes, worklogs |
| Vendor | orgId, name, contactName?, contactEmail?, contactPhone?, categories[], archivedAt? | org, quotes, requests |
| MaintenanceQuote | requestId, vendorId?, amountCents, documentStorageKey?, note?, createdAt | request, vendor? |
| MaintenanceWorklog | requestId, authorId?, body, createdAt | request, author? |
| Invoice | leaseId, periodStart, dueDate, amountCents (legacy cache), subtotalCents, taxCents, totalCents, status (DRAFT/DUE/PAID/OVERDUE), paidAt, paidAmountCents, paidNote, billingRunId? | org, lease, billingRun?, lineItems — unique(leaseId, periodStart) |
| LeaseSignature | leaseId, tenantId, signedName, signedAt, ipAddress, userAgent, latitude, longitude, locationText | lease, tenant — unique(leaseId, tenantId) |
| LeaseReviewRequest | leaseId, tenantId, clauseExcerpt, tenantNote, status, pmResponse, respondedAt | lease (no FK to tenant) |
| Approval | orgId, landlordId, propertyId?, kind, subjectType?, subjectId?, payload (Json), state, reason?, decisionNote?, requestedById, decidedById?, decidedAt? | org, landlord |
| Applicant | orgId, firstName, lastName, email, phone, idNumber?, employer?, grossMonthlyIncomeCents?, netMonthlyIncomeCents?, tpnConsentGiven, tpnConsentAt?, tpnConsentCapturedById? | org, applications |
| Application | orgId, applicantId, propertyId?, unitId?, stage, decision, decisionReason?, decidedAt?, assignedReviewerId?, requestedMoveIn?, sourceChannel?, affordabilityRatio?, convertedTenantId?, convertedLeaseId? | org, applicant, property?, unit?, reviewer?, tpnCheck?, documents, notes, convertedTenant? |
| ApplicationDocument | applicationId, filename, mimeType, sizeBytes, storageKey, description?, uploadedById | application |
| ApplicationNote | applicationId, authorId, body | application, author |
| TpnCheck | applicationId (unique), status, requestedAt?, receivedAt?, tpnReferenceId?, recommendation?, summary?, reportPayload? (Json), reportBlobKey?, waivedReason?, waivedById? | application |
| Notification | orgId, userId?, role?, type, subject, body, payload? (Json), entityType?, entityId?, readAt?, createdAt | org, user?, deliveries |
| NotificationDelivery | notificationId, channel (IN_APP/EMAIL/SMS), status (QUEUED/SENT/FAILED/SKIPPED), lastAttemptAt?, error?, providerRef? | notification |
| OrgMonthlySnapshot | orgId, periodStart, occupiedUnits, totalUnits, vacantUnits, activeLeases, expiringLeases30, openMaintenance, blockedApprovals, billedCents, collectedCents, arrearsCents, trustBalanceCents, unallocatedCents, refreshedAt | org |
| PropertyMonthlySnapshot | orgId, propertyId, periodStart, occupiedUnits, totalUnits, openMaintenance, arrearsCents, grossRentCents, refreshedAt | org, property |
| LandlordMonthlySnapshot | orgId, landlordId, periodStart, grossRentCents, collectedCents, disbursedCents, maintenanceSpendCents, vacancyDragCents, trustBalanceCents, refreshedAt | org, landlord |
| AgentMonthlySnapshot | orgId, agentId, periodStart, openTickets, blockedApprovals, upcomingInspections, refreshedAt | org, managingAgent |
| AreaNotice | orgId, type, title, body, startsAt?, endsAt?, audienceQuery (Json), createdById, createdAt, publishedAt? | org, deliveries |
| NoticeDelivery | noticeId, userId, notificationId?, channel, status, lastAttemptAt?, error?, createdAt | notice, user, notification? |
| UsageAlertRule | orgId, utilityType, thresholdPct, enabled | org, events |
| UsageAlertEvent | orgId, ruleId, leaseId, meterId?, notificationId?, periodStart, observedQty, baselineQty, deltaPct, createdAt | org, rule, lease, meter?, notification? |
| LoadSheddingOutage | orgId, propertyId?, eskomAreaCode?, source, startsAt, endsAt, stage?, note?, externalEventId?, createdById?, createdAt | org, property? |
| OrgIntegration | orgId, provider (IntegrationProvider), status, externalAccountId?, accessTokenCipher?, refreshTokenCipher?, tokenExpiresAt?, connectedAt?, connectedById?, lastError? | org — unique(orgId, provider) — encrypted tokens via `lib/crypto.ts` |
| InvoiceLineItem | invoiceId, kind (InvoiceLineItemKind), description, quantity?, unitRateCents?, amountCents, sourceType?, sourceId?, estimated | invoice, allocations |
| Meter | orgId, unitId, type (UtilityType), serial?, installedAt?, retiredAt? | org, unit, readings |
| MeterReading | meterId, takenAt, readingValue (Decimal), source (MeterReadingSource), recordedById? | meter — unique(meterId, takenAt) |
| UtilityTariff | orgId, propertyId? (override), type, structure, effectiveFrom, effectiveTo?, flatUnitRateCents?, tieredJson? | org, property? |
| BillingRun | orgId, periodStart, status, createdById?, publishedAt?, summary? (Json) | org, invoices — unique(orgId, periodStart) |
| PaymentReceipt | orgId, tenantId?, leaseId?, receivedAt, amountCents, method (PaymentMethod), source (ReceiptSource), externalRef?, note?, recordedById? | org, tenant?, lease?, allocations |
| Allocation | receiptId, target (AllocationTarget), invoiceLineItemId?, depositLeaseId?, amountCents, reversedAt?, reversedById? | receipt, invoiceLineItem?, depositLease? |
| TrustAccount | orgId, landlordId, name, bankRef?, openedAt | org, landlord, entries — unique(orgId, landlordId) (per-landlord) |
| TrustLedgerEntry | trustAccountId, landlordId (required, must match account), occurredAt, type (LedgerEntryType), amountCents, tenantId?, leaseId?, sourceType?, sourceId?, note? | trustAccount, landlord, tenant?, lease? |
| ReconciliationRun | orgId, periodStart, periodEnd, status, summary? (Json) | org, exceptions |
| FinancialYear | orgId, startDate, endDate, lockedAt?, lockedById? | org, lockedBy?, reconciliations, taxPacks — unique(orgId, startDate) |
| AnnualReconciliation | orgId, yearId, scopeType, scopeId?, summary, storageKey?, generatedAt | org, year |
| TaxPack | orgId, yearId, subjectType, subjectId, totalsJson, storageKey?, csvKey?, previousStorageKeys[], previousCsvKeys[], regeneratedAt?, regenerationCount, transmissionAdapter, transmissionResult? | org, year, lines — unique(orgId, yearId, subjectType, subjectId) |
| TaxPackLine | packId, category, subCategory?, amountCents, evidenceRefs? (Json) | pack |
| ReconciliationException | runId, kind (UNMATCHED_BANK_TX/UNALLOCATED_RECEIPT/OVER_ALLOCATED/MISSING_LEDGER_ENTRY/BALANCE_MISMATCH), entityType, entityId, detail (Json), resolvedAt?, resolvedById? | run |
| Statement | orgId, type (StatementType), subjectType, subjectId, periodStart, periodEnd, openingBalanceCents, closingBalanceCents, totalsJson, storageKey?, generatedAt | org, lines |
| StatementLine | statementId, occurredAt, description, debitCents, creditCents, runningBalanceCents, sourceType?, sourceId? | statement |
| BackupSnapshot | orgId, takenAt, sizeBytes, storageKey, checksum, kind, status, errorMessage?, pgDumpVersion? | org |
| BackupVerificationRun | orgId, startedAt, completedAt?, status, missingCount, corruptCount, summary?, details? | org |
| DebiCheckMandate | orgId, leaseId (unique), tenantId, mandateExternalId?, upperCapCents, status (DebiCheckMandateStatus), signedAt? | lease |
| Inspection | orgId, leaseId, unitId, type (InspectionType), status (InspectionStatus), scheduledAt, startedAt?, completedAt?, signedOffAt?, staffUserId?, agentId?, summary?, reportKey? | org, lease, unit, areas, signatures |
| InspectionArea | inspectionId, name, orderIndex | inspection, items |
| InspectionItem | areaId, label, condition (ConditionRating), note?, estimatedCostCents?, responsibility? (ChargeResponsibility) | area, photos |
| InspectionPhoto | itemId, storageKey, caption? | item |
| InspectionSignature | inspectionId, signerRole (Role), signerUserId?, signedName, signedAt, ipAddress?, userAgent? | inspection |
| OffboardingCase | orgId, leaseId (unique), openedAt, closedAt?, status (OPEN/SETTLING/CLOSED) | org, lease, tasks, charges, settlement? |
| OffboardingTask | caseId, label, orderIndex, done, doneAt?, doneById? | case |
| MoveOutCharge | caseId, label, amountCents, responsibility (ChargeResponsibility), sourceInspectionItemId? | case |
| DepositSettlement | caseId (unique), depositHeldCents, chargesAppliedCents, refundDueCents, balanceOwedCents, statementKey?, finalizedAt? | case (immutable once finalised) |

## Auth Flow

```
proxy.ts (route guard) → lib/auth.config.ts (JWT/session callbacks) → lib/auth.ts (credentials provider + bcrypt)
Login: components/login-form.tsx → signIn('credentials') → window.location.href → proxy.ts verifies JWT
Layouts: (staff)/layout.tsx and (tenant)/layout.tsx call auth() as defense-in-depth
```

## File Index

### Config (root)
| File | Exports / Purpose | Lines |
|------|-------------------|-------|
| next.config.ts | Empty NextConfig | 8 |
| proxy.ts | `proxy(req)`, `config` — route guard: public paths, role-based redirects | 59 |
| prisma.config.ts | defineConfig with schema path, datasource URL, and Prisma seed command (`node --import tsx prisma/seed.ts`) | 12 |
| tsconfig.json | strict, ES2017, @/* alias | 35 |
| components.json | shadcn UI config | — |
| vercel.json | Vercel cron registrations: `/api/cron/debicheck-retry` (daily 00:00 UTC), `/api/cron/reconciliation` twice daily (04:00 + 16:00 UTC ≙ 06:00 + 18:00 SAST), `/api/cron/notifications-dispatch` (every 5 min), `/api/cron/eskom-sync` (03:00 UTC), `/api/cron/usage-alerts` (04:00 UTC), `/api/cron/payment-alerts` (05:00 UTC), `/api/cron/backup-daily` (00:30 UTC), `/api/cron/backup-verify` (Sundays 01:00 UTC) | 13 |

### prisma/
| File | Purpose | Lines |
|------|---------|-------|
| prisma/schema.prisma | Full Prisma schema for the Property Management Ops domain model | 1411 |
| prisma/seed.ts | Deterministic Acme demo-data generator that recreates the org-scoped seed with demo users unchanged plus 45 properties / ~245 units, landlords, agents, vendors, leases, invoices, receipts, trust activity, utilities, applications, notices, inspections, offboarding, statements, and monthly snapshots | 2460 |

### lib/
| File | Exports | Lines |
|------|---------|-------|
| db.ts | `db` — PrismaClient singleton with pg adapter | 14 |
| marketing-theme.ts | `MARKETING_THEME` — shared public-site palette built around `#001030` and supporting neutrals/gold accents | 18 |
| auth.config.ts | `authConfig` — edge-safe NextAuthConfig (JWT strategy, callbacks: jwt+session add userId/role/orgId plus landlordId/managingAgentId/smsOptIn) | 37 |
| auth.ts | `handlers, auth, signIn, signOut` — full NextAuth with Credentials provider, bcrypt, loginSchema; credentials authorize now returns role-scope ids + sms opt-in | 40 |
| auth/with-org.ts | `withOrg<P>()` — HOF for auth'd API routes; `RouteCtx {orgId, userId, role, user?}`, `RouteParams<P>` | 54 |
| errors.ts | `ApiError` class (badRequest/unauthorized/forbidden/notFound/validation/conflict/internal), `toErrorResponse()`, `ApiErrorCode` type | 60 |
| financial-year.ts | `FINANCIAL_YEAR_START`, `resolveFinancialYearForDate()`, `currentFinancialYear()`, `previousFinancialYear()`, `formatFinancialYearLabel()`, `isDateWithinFinancialYear()` | 54 |
| format.ts | `FINANCIAL_YEAR_START`, `formatZar(cents)`, `formatDate(d)` | 12 |
| lease-template.ts | `LeaseTemplateData`, `LeaseSection`, `renderLeaseAgreement(data)` — generic SA residential lease generator (15 sections) | 200 |
| email.ts | `sendTenantInvite({to, tenantName, orgName, tempPassword, appUrl})`, `SendResult` — Gmail SMTP (nodemailer) transactional email; no-ops gracefully if `GMAIL_USER`/`GMAIL_APP_PASSWORD` missing | 112 |
| sms.ts | `sendTenantInviteSms`, `sendMaintenanceCreatedOpsSms`, `sendMaintenanceCreatedTenantSms`, `sendMaintenanceStatusTenantSms`, `sendLeaseSignedOpsSms`, `sendReviewRequestOpsSms`, `sendReviewResponseTenantSms`, `sendInvoicePaidTenantSms`, `SendResult` — SMS via SMS Gateway for Android (cloud mode); normalizes ZA local numbers to E.164; ops messages go to `OPS_SMS_RECIPIENTS`; no-ops if unconfigured | — |
| blob.ts | `validateFile(file)` (20MB, pdf/png/jpeg/webp), `uploadBlob(path, file, opts?)`, `deleteBlob(pathname)`, `createSignedUploadUrl({ pathname, contentType, maxBytes? })` (M3: scopes a one-time photo upload URL through `/api/uploads/blob/[...storageKey]`; png/jpeg/webp only) | 58 |
| utils.ts | `cn()` — clsx + tailwind-merge | 6 |
| permissions.ts | `landlordHasExecutiveAuthority(org)`, `requiresLandlordApproval(action, org)`, `orgOwnerTypeLabel()` — gates landlord actions based on Org.ownerType | — |
| nav/validate.ts | `validateNav()` — planner utility that reports missing sidebar destinations with loose dynamic-route matching; non-blocking by design | 119 |
| integrations/tpn/adapter.ts | `tpnAdapter.submitCheck(ctx, payload)`, `tpnAdapter.mapResponse()`, `TpnApplicantPayload`, `TpnResponse` — provider-agnostic TPN adapter; now reads per-org credentials via `readDecryptedTokens(ctx, "TPN")` (M2); falls back to `TPN_API_URL` env var for the shared endpoint; throws `ApiError.conflict("TPN not configured for this org")` when no CONNECTED row exists | 174 |
| crypto.ts | `encrypt(plaintext)`, `decrypt(cipher)`, `isCryptoConfigured()` — AES-256-GCM round-trip for `OrgIntegration` tokens using `INTEGRATION_SECRET_KEY` (32-byte hex); stdlib-only, throws `ApiError.internal` on missing/malformed key or auth-tag failure | 75 |
| integrations/stitch/payments-adapter.ts | `stitchPaymentsAdapter.createCheckoutSession(ctx, input)`, `verifyWebhookSignature()`, `parseWebhookEvent()` — credential-gated (`STITCH_PAYMENTS`) hosted-checkout adapter; HMAC-verifies via `STITCH_WEBHOOK_SECRET` | 99 |
| integrations/stitch/debicheck-adapter.ts | `stitchDebicheckAdapter.requestMandate`, `submitCollection`, `handleMandateWebhook`, `handleCollectionWebhook` — credential-gated (`STITCH_DEBICHECK`) mandate + collection primitives | 121 |
| integrations/stitch/payouts-adapter.ts | `stitchPayoutsAdapter.initiatePayout`, `handlePayoutWebhook`, `verifyPayoutWebhookSignature` — credential-gated (`STITCH_PAYOUTS`) disbursement adapter | 71 |
| integrations/qbo/adapter.ts | `qboAdapter.connectOAuth(ctx, authCode)`, `refreshToken(ctx)`, `fetchBankTransactions(ctx, since)` — credential-gated (`QUICKBOOKS`); no-ops + returns stub payload when `QBO_CLIENT_ID` unset | 80 |
| integrations/qbo/mapping.ts | `mapQboTransactionToBankTransaction()`, `BankTransaction` type — normalises QBO txn shape to canonical reconciliation input | 60 |
| integrations/eskom/adapter.ts | `EskomEvent`, `fetchAreaSchedule(ctx, areaCode)`, `resolveAreaCode(ctx, property)` — stubbed EskomSePush schedule adapter with fixture events until live credentials land | 53 |
| integrations/bank-csv/dialects.ts | `BankCsvDialect`, `getDialect(name)` — header maps for `generic` CSV dialect in M2; bank-specific dialects deferred to M4 | 45 |
| reports/statement-pdf.ts | `renderStatementPdf(statement)` — deterministic PDF buffer with TENANT/LANDLORD/TRUST layouts routed by `StatementType` | 98 |
| reports/debit-order-instruction-pdf.ts | `renderDebitOrderInstruction({ org, lease, bankDetails })` — one-page PDF with bank details + reference (`${BANK_REF_PREFIX}${lease.id}`) + suggested cap (`rent + 25%`) | 99 |
| reports/inspection-pdf.ts | `renderInspectionReport(data)` — deterministic HTML/PDF buffer for an Inspection with nested areas/items/photos + signatures; same idiom as `lease-template.ts` | — |
| reports/settlement-pdf.ts | `renderSettlementStatement(data)` — deterministic HTML/PDF buffer summarising deposit held, charges applied, refund due, balance owed | 87 |

| reports/tax-pack-pdf.ts | `renderTaxPackPdf(input)` — deterministic accountant-ready HTML/PDF buffer for landlord/tenant tax support packs with totals, category breakdown, audit-chain evidence, and the approved encryption disclosure copy | 158 |
| reports/tax-pack-csv.ts | `renderTaxPackCsv(input)` — deterministic RFC 4180 CSV export for tax packs with one row per evidence ref (or a blank-evidence row fallback) | 65 |

**Manifest refresh (2026-04-23) - supersedes older `lib/email.ts` entry above**
| File | Exports | Lines |
|------|---------|-------|
| email.ts | `EmailMailbox`, `MailboxConfig`, `resolveMailboxConfig()`, `sendEmail()`, `sendTenantInvite({to, tenantName, orgName, tempPassword, appUrl})`, `sendSignupRequest()`, `sendContactRequest()`, `SendResult` - nodemailer mailer with shared SMTP + named `noreply` / `updates` mailboxes; legacy Gmail envs still supported | 346 |

### lib/services/
| File | Exports | Lines |
|------|---------|-------|
| dashboard.ts | `getDashboardSummary(ctx)` → portfolio totals, occupancy, lease expiries, invoice overview (invoiced vs paid, overdue accounts, cashflow by unit, expiry buckets), recent leases; M2 adds `incomeByKind` (RENT vs UTILITY_* split sourced from `InvoiceLineItem`) | 301 |
| staff-analytics.ts | `getStaffCommandCenter(ctx, filters?)` (Phase 1: `kpis` includes NET_RENTAL_INCOME / RENT_BILLED / RENT_COLLECTED / URGENT_MAINTENANCE; adds `kpiSparks` per-KPI 12-mo series and `collectionsCombo` ComboChartPoint[] for billed/collected/prior overlay), `getStaffPortfolio`, `getStaffFinance`, `getStaffMaintenance`, `getStaffOperations` | 813 |
| leases.ts | `DerivedStatus` type, `deriveStatus()`, `listLeases()`, `getLease()`, `createLease()`, `updateDraftLease()`, `activateLease()` (M2: writes `DEPOSIT_IN` ledger entry when `depositReceivedAt` set), `terminateLease()`, `renewLease()`, `setPrimaryTenant()`, `setSelfManagedDebitOrder()` | — |
| properties.ts | `listProperties()`, `getProperty()`, `createProperty()`, `updateProperty()`, `softDeleteProperty()` | 51 |
| tenants.ts | `listTenants()`, `getTenant()`, `detectDuplicates()`, `createTenant()`, `updateTenant()`, `archiveTenant()`, `unarchiveTenant()`, `deleteTenant()` (hard delete — requires archived; cascades LeaseTenant, MaintenanceRequest, LeaseSignature, LeaseReviewRequest, linked User; nulls Document.tenantId), `inviteTenantToPortal()` — creates a TENANT User, links via Tenant.userId, returns one-time temp password | 170 |
| units.ts | `UnitOccupancy` type, `getUnitOccupancy()`, `listUnits()`, `getUnit()`, `createUnit()`, `updateUnit()`, `deleteUnit()` | 97 |
| documents.ts | `uploadLeaseAgreement()`, `getDocumentForDownload()` — lease-doc upload now records SHA-256 checksum + `encryptionNote="provider-default"` on insert | 40 |
| team.ts | `listTeam()`, `createTeamUser()`, `updateTeamUser()`, `getOrg()`, `updateOrg()`, `changeOwnPassword()` | 102 |
| tenant-portal.ts | `getTenantProfile()`, `getActiveLeaseForTenant()`, `getPendingLeaseForTenant()` (DRAFT lease w/ signatures+reviewRequests filtered to tenant), `getTenantLeases()`, `listTenantDocuments()`, `getTenantDocumentForDownload()` — all scoped by User.id → Tenant.userId | 106 |
| signatures.ts | `signLeaseAsTenant()`, `getTenantSignatureForLease()`, `listLeaseSignatures(ctx)`, `createReviewRequest()`, `listTenantReviewRequests()`, `listLeaseReviewRequests(ctx)`, `respondToReviewRequest(ctx)` — M4 routes lease-signature/review comms through `createNotification()` instead of direct SMS sends | 231 |
| onboarding.ts | `onboardTenant(ctx, input)` — single-transaction tenant + DRAFT lease + optional portal account with temp password | 94 |
| maintenance.ts | `createTenantMaintenanceRequest()`, `listTenantMaintenanceRequests()`, `getTenantMaintenanceRequest()`, `listMaintenanceRequests()`, `getMaintenanceRequest()`, `updateMaintenanceRequest()`, `assignVendor()`, `captureQuote()`, `scheduleMaintenance()`, `completeMaintenance()`, `captureMaintenanceInvoice()` (M3: posts a `FEE` ledger entry with `-invoiceCents` against the property's landlord), `addMaintenanceWorklog()` | — |
| vendors.ts | `listVendors`, `getVendor`, `createVendor`, `updateVendor`, `archiveVendor` (soft delete via `archivedAt`) — every mutation audits | — |
| inspections.ts | `listInspections`, `getInspection`, `createInspection`, `startInspection`, `recordArea`, `recordItem`, `completeInspection` (renders + uploads PDF, stamps `reportKey`), `signInspection` (either-signer rule per locked decision #7) | — |
| offboarding.ts | `openOffboardingCase` (idempotent; seeds default tasks gated on `OrgFeature.UTILITIES_BILLING`), `listOffboardingCases`, `getOffboardingCase`, `listOffboardingTasks`, `toggleOffboardingTask`, `addMoveOutCharge`, `removeMoveOutCharge`, `finaliseDepositSettlement` (immutable; writes `DEPOSIT_OUT` ledger entry when refund > 0), `closeOffboardingCase`, `getTenantOffboardingSummary`, `listTenantInspections`, `getTenantInspection`, `listTenantSignedInspectionsForLease`, `DEFAULT_OFFBOARDING_TASK_LABELS`, `__setSettlementUploaderForTests` | — |
| invoices.ts | `ensureInvoicesForLease()` (idempotent month-by-month generator, past→PAID, current/future→DUE), `listTenantInvoices()`, `getInvoiceForTenant()`, `listLeaseInvoices()`, `markInvoicePaid()` (M2: creates MANUAL `PaymentReceipt`, allocates against line items, writes ledger via `lib/services/trust.ts`; M4 also writes tenant `Notification`), `markInvoiceUnpaid()` (M2: reverses auto-generated allocations + deletes the receipt) | 260 |
| audit.ts | `writeAudit(ctx, input)` — reusable audit-log writer with JSON-safe payload normalization; swallows insert failures after logging | 90 |
| landlords.ts | `listLandlords()`, `getLandlord()`, `createLandlord()`, `updateLandlord()` | — |
| managing-agents.ts | `listManagingAgents()`, `getManagingAgent()`, `createManagingAgent()`, `updateManagingAgent()` | — |
| landlord-portal.ts | `getLandlordProfile()`, `listLandlordProperties()`, `getLandlordPortfolioSummary()` — scoped by User.id → User.landlordId | — |
| approvals.ts | `requestApproval()`, `listPendingForLandlord()`, `listApprovalsForOrg()`, `decideApproval()`, `cancelApproval()` — generic approval workflow (MAINTENANCE_COMMIT etc.) | — |
| org-features.ts | `getOrgFeatures()`, `setOrgFeature()`, `assertFeature()` — workspace feature flag lookups/upserts with audit logging on toggles | 97 |
| applications.ts | `listApplications`, `getApplication`, `createApplication`, `updateApplication`, `submitApplication`, `assignReviewer`, `addApplicationNote`, `uploadApplicationDocument`, `withdrawApplication` — applicant+application CRUD with stage transitions; writes AuditLog + notification hooks on submit | 330 |
| tpn.ts | `captureTpnConsent`, `requestTpnCheck`, `recordTpnResult`, `waiveTpnCheck`, `getTpnCheck` — TPN integration lifecycle; persists TpnCheck rows + reportPayload; audited. M2: calls `tpnAdapter.submitCheck(ctx, payload)` so credentials route through `OrgIntegration(TPN)` | — |
| vetting.ts | `approveApplication`, `declineApplication`, `convertApplicationToTenant` — decision + conversion service; enforces TPN/consent gates; delegates to `onboardTenant`; notifies assigned reviewer | 256 |
| notifications.ts | `createNotification(ctx, input)`, `enqueueDeliveries(ctx, notification, channels)`, `dispatchPending()`, `listNotificationsForUser(ctx, filters)`, `markNotificationRead(ctx, id)`, `resolveDefaultChannels(ctx, notificationType, recipient?)` — notification inbox + delivery queue (best-effort on legacy test/mocked transaction clients) | 273 |
| role-scope.ts | `withRoleScopeFilter(ctx, propertyClause)`, `withTenantLeaseFilter(ctx, leaseClause)`, `assertCanReadProperty(ctx, propertyId)` — M4 role scoping shim for landlord/agent/tenant reads | 76 |
| snapshots.ts | `SnapshotEventKind`, `recordSnapshotEvent(ctx, kind, refs?)`, `recomputeOrgSnapshot()`, `recomputePropertySnapshot()`, `recomputeLandlordSnapshot()`, `recomputeAgentSnapshot()`, `monthFloor()` — monthly snapshot recompute helpers for M4 analytics foundations | 394 |
| payment-alerts.ts | `evaluatePaymentAlerts(orgId)` — emits reminder / overdue / final tenant notifications per invoice tier with idempotency via existing `Notification` rows | 86 |
| usage-alerts.ts | `listRules(ctx)`, `upsertRule(ctx, input)`, `evaluateUsageAlerts(orgId)` — rolling-3-period meter anomaly detection with per-meter event dedupe | 147 |
| area-notices.ts | `createNotice(ctx, input)`, `publishNotice(ctx, id)`, `listNotices(ctx, filters)`, `getNotice(ctx, id)`, `resolveNoticeAudience(ctx, notice)`, `dispatchNotice(ctx, id)` — dynamic-audience area notice fan-out with `NoticeDelivery` audit rows | 211 |
| outages.ts | `listUpcomingOutages(ctx, filters)`, `getOutage(ctx, id)`, `createPmOutage(ctx, input)`, `deletePmOutage(ctx, id)`, `recordEskomOutage(ctx, event, propertyId?)`, `syncEskomForOrg(orgId)` — PM + EskomSePush outage sync/service layer | 207 |
| org-integrations.ts | `listOrgIntegrations`, `getOrgIntegration`, `connectOrgIntegration` (encrypts tokens, audits), `disconnectOrgIntegration`, `markIntegrationError`, `readDecryptedTokens` (server-only; throws unless CONNECTED), `DecryptedTokens`, `ConnectInput` types | 187 |
| utilities.ts | `listMeters`, `getMeter`, `createMeter`, `retireMeter`, `recordMeterReading` (enforces `@@unique([meterId, takenAt])`), `latestReading`, `estimateMissingReading` (rolling 3-month avg, falls back to ROLLOVER), `listTariffs`, `upsertTariff` (org-wide default + optional property override); every mutation audits | 273 |
| billing.ts | `InvoiceLineItemDraft`, `calculateUtilityChargesForLease`, `generateBillingRun` (idempotent per `(orgId, periodStart)`; rent + utility lines), `rebuildInvoiceTotals`, `previewBillingRun`, `publishBillingRun` (DRAFT→DUE, estimate-gate honoured), `addManualLineItem`, `removeLineItem`, `listBillingRuns`, `getBillingRun` | 543 |
| payments.ts | `listReceipts`, `getReceipt`, `recordIncomingPayment`, `importReceiptsCsv` (dialect-aware via `lib/integrations/bank-csv/dialects.ts`; dupe-key `(orgId, externalRef)`; matches `${BANK_REF_PREFIX}${leaseId}` references), `allocateReceipt` (auto-allocate oldest-first when caller omits allocations), `reverseAllocation` (30-day gate for non-ADMIN, indefinite for ADMIN, audited); every mutation emits matching ledger entries via `trust.ts` | 424 |
| trust.ts | `ensureTrustAccount(ctx, landlordId)`, `writeLedgerEntry`, `getTrustBalance(ctx, landlordId)`, `getPortfolioTrustBalance` (per-landlord rollup), `getTenantTrustPosition`, `recordManualLedgerEntry`, `disburseToLandlord` (calls `stitchPayoutsAdapter.initiatePayout`, persists external id on `TrustLedgerEntry.sourceId`); enforces `entry.landlordId === account.landlordId` on every insert | 242 |
| statements.ts | `generateTenantStatement`, `generateLandlordStatement`, `generateTrustStatement` (per-landlord, replaces org-wide plan default), `regenerateStatement` (re-renders PDF, keeps `StatementLine` rows frozen), `listStatements`; each generation uploads PDF via `lib/blob.ts` and persists `storageKey` | 426 |
| reconciliations.ts | `ReconciliationPreview`, `previewRecon`, `runTrustReconciliation` (matches bank txns to `PaymentReceipt` by `(amountCents, externalRef)` within ±3 business days; unmatched → `ReconciliationException { kind: UNMATCHED_BANK_TX }`; deterministic rerun per `(orgId, periodStart, periodEnd)`), `listReconciliationRuns`, `resolveException` | 252 |
| stitch-payments.ts | `InitiateInboundPaymentInput`, `initiateInboundPayment` (returns hosted-checkout redirect URL), `StitchWebhookResult`, `handleStitchWebhook` (signature-verified; creates `PaymentReceipt { source: STITCH }` + auto-allocates), `isStitchPaymentsConnectedAnywhere` | 148 |
| debicheck.ts | `createMandateRequest`, `submitMonthlyCollection` (cap-aware; refuses when `amountCents > upperCapCents`), `retryUnpaidCollection` (day +2; flips invoice to OVERDUE + notifies when still unpaid), `isDebicheckConnectedAnywhere`, `applyMandateWebhookStatus` | 175 |

| year-end.ts | `openYear()`, `lockYear()`, `unlockYearForRegeneration()`, `getYearOrThrow()`, `listYears()`, `generateAnnualReconciliation()` — financial-year lifecycle + deterministic annual reconciliation summaries | 270 |
| tax-reporting.ts | `TaxPackTotals`, `TaxPackEvidenceRef`, `TransmissionAdapter`, `recordOnlyAdapter`, `registerTransmissionAdapter()`, `generateLandlordTaxPack()`, `generateTenantTaxPack()`, `getPackOrThrow()`, `listPacksForYear()`, `regenerateTaxPackPdf()`, `regenerateTaxPackCsv()`, `TaxPackWithLines`, `TaxPackSummary` | 705 |
| backup.ts | `runDailyBackup()`, `runBlobIndex()`, `runVerification()`, `pruneOldBackups()`, `latestSnapshot()`, `latestVerification()`, `__setBackupRuntimeForTests()` — pg_dump/blob-manifest backup service with weekly verification and 730-day retention pruning | 372 |

### lib/zod/
| File | Exports | Lines |
|------|---------|-------|
| analytics.ts | `rangePresetSchema`, `compareModeSchema`, `analyticsSearchParamsSchema`, `AnalyticsSearchParams` — URL search-param shapes for the dashboard analytics filter contract | 16 |
| lease.ts | `leaseStateEnum`, `createLeaseSchema`, `updateDraftLeaseSchema`, `terminateLeaseSchema`, `leaseListQuerySchema` | 51 |
| property.ts | `provinceEnum`, `createPropertySchema`, `updatePropertySchema` | 17 |
| tenant.ts | `createTenantSchema`, `updateTenantSchema` | 12 |
| unit.ts | `createUnitSchema`, `updateUnitSchema` | 12 |
| team.ts | `roleEnum`, `createUserSchema` (incl. optional landlordId/managingAgentId), `updateUserSchema`, `updateOrgSchema` (incl. ownerType, landlordApprovalThresholdCents), `changePasswordSchema` | — |
| org-features.ts | `featureFlagKeys`, `featureFlagKeyEnum`, `FeatureFlagKey`, `JsonConfig`, `setOrgFeatureSchema` | 51 |
| landlords.ts | `createLandlordSchema`, `updateLandlordSchema` | — |
| managing-agents.ts | `createManagingAgentSchema`, `updateManagingAgentSchema` | — |
| approvals.ts | `approvalKindEnum`, `decideApprovalSchema` | — |
| document.ts | `documentKindEnum`, `documentUploadMetaSchema` | 4 |
| maintenance.ts | `maintenancePriorityEnum`, `maintenanceStatusEnum`, `createMaintenanceRequestSchema`, `updateMaintenanceRequestSchema`, `assignVendorSchema`, `captureQuoteSchema`, `scheduleMaintenanceSchema`, `completeMaintenanceSchema`, `captureMaintenanceInvoiceSchema`, `addMaintenanceWorklogSchema` | — |
| vendors.ts | `createVendorSchema`, `updateVendorSchema` | — |
| inspection.ts | `inspectionTypeEnum`, `inspectionStatusEnum`, `conditionRatingEnum`, `chargeResponsibilityEnum`, `signerRoleEnum`, `createInspectionSchema`, `recordAreaSchema`, `recordItemSchema`, `completeInspectionSchema`, `signInspectionSchema`, `registerPhotoSchema` | 64 |
| offboarding.ts | `chargeResponsibilityEnum`, `openOffboardingCaseSchema`, `toggleOffboardingTaskSchema`, `addMoveOutChargeSchema`, `finaliseDepositSettlementSchema` | — |
| invoice.ts | `markInvoicePaidSchema` | 8 |
| signature.ts | `signLeaseSchema`, `createReviewRequestSchema`, `respondReviewRequestSchema` | — |
| onboarding.ts | `onboardTenantSchema` — full form schema for tenant+lease+invite in one step (accepts optional `fromApplicationId` cuid for application conversion) | — |
| application.ts | `applicationListQuerySchema`, `createApplicationSchema`, `updateApplicationSchema`, `assignReviewerSchema`, `addApplicationNoteSchema`, `withdrawApplicationSchema`, `applicationDecisionSchema`, `convertApplicationSchema` | 79 |
| tpn.ts | `captureTpnConsentSchema`, `requestTpnCheckSchema`, `waiveTpnCheckSchema`, `tpnWebhookSchema` | — |
| org-integrations.ts | `integrationProviderEnum`, `connectOrgIntegrationSchema` (`{ provider, externalAccountId, accessToken, refreshToken?, tokenExpiresAt? }`), `disconnectOrgIntegrationSchema` | 25 |
| utilities.ts | `utilityTypeEnum`, `meterReadingSourceEnum`, `tariffStructureEnum`, `createMeterSchema`, `recordMeterReadingSchema`, `upsertUtilityTariffSchema` | 52 |
| billing.ts | `generateBillingRunSchema` (`{ periodStart: isoDate }`), `addLineItemSchema`, `publishBillingRunSchema` | 34 |
| payments.ts | `paymentMethodEnum`, `receiptSourceEnum`, `recordIncomingPaymentSchema`, `allocateReceiptSchema`, `reverseAllocationSchema`, `importReceiptsSchema` | 37 |
| trust.ts | `disburseSchema`, `manualLedgerEntrySchema` | 31 |
| statements.ts | `generateStatementSchema` (`{ period: { start, end } }`) | 14 |
| reconciliations.ts | `resolveExceptionSchema` | 15 |
| stitch.ts | `stitchCallbackSchema`, `stitchCheckoutSchema`, `debicheckMandateSchema` | 24 |
| signup.ts | `publicSignupRequestSchema` — marketing `/signup` submissions | 16 |
| contact.ts | `publicContactSchema` — marketing `/contact` submissions | 10 |
| area-notices.ts | `audienceQuerySchema`, `createNoticeSchema`, `publishNoticeSchema`, `dispatchNoticeSchema` | 17 |

| year-end.ts | `openYearSchema`, `lockYearSchema`, `annualReconScopeSchema` | 12 |
| tax-pack.ts | `generateLandlordPackSchema`, `generateTenantPackSchema`, `regeneratePackSchema` | 14 |

### types/
| File | Purpose | Lines |
|------|---------|-------|
| next-auth.d.ts | Augments Session.user (id, email, name, role, orgId) and JWT (userId, role, orgId) | 24 |

### docs/
| File | Purpose | Lines |
|------|---------|-------|
| docs/2026-04-21-roles-and-approvals-changes.md | Product and schema notes for roles, landlord approvals, and portal additions | 150 |
| docs/2026-04-23-alignment-tasks.md | Task-by-task execution plan that refines the product overview plan with locked decisions and milestone-ready deliverables | 703 |
| docs/2026-04-23-product-overview-gap-checklist.md | Product deck checklist mapping implemented, partial, and missing capabilities against the current app | 55 |
| docs/2026-04-23-product-overview-implementation-plan.md | Deep phased implementation plan covering tenant lifecycle, finance, approvals, portals, notifications, and platform hardening | 997 |
| docs/2026-04-24-m2-plan.md | M2 task-by-task execution plan (38 tasks across Phases A–H — billing, payments, trust, statements, marketing) | 737 |
| docs/2026-04-25-m3-plan.md | M3 task-by-task execution plan (31 tasks across Phases A–H — maintenance capture, inspections, offboarding, deposit settlement; no maintenance approval gate per locked decision #1) | 601 |

| docs/2026-04-27-m5-plan.md | M5 execution plan for financial years, tax packs, backup verification, and compliance metadata | 231 |

### scripts/
| File | Purpose | Lines |
|------|---------|-------|
| scripts/report-missing-pages.ts | CLI planner report for missing nav destinations based on `validateNav()`; prints missing routes without failing the build | 19 |
| scripts/backfill-property-owners.ts | Dry-run-first backfill for missing `Property.landlordId` / `assignedAgentId`; unresolved rows are emitted as CSV on stdout and `--write` persists safe assignments | 246 |
| scripts/backfill-invoice-line-items.ts | Idempotent one-time backfill that writes a single `RENT` `InvoiceLineItem` per legacy `Invoice` without line items, mirrors totals into `subtotalCents`/`totalCents`. Dry-run default; `--write` persists. Wired as `backfill:invoice-lines` in `package.json` | 67 |
| scripts/backfill-document-encryption-note.ts | Dry-run-first M5 compliance backfill that sets `Document.encryptionNote = "provider-default"` for legacy rows using a direct Prisma connection | 35 |

### tests/
| File | Purpose | Lines |
|------|---------|-------|
| tests/services/audit.test.ts | Node test-runner coverage for audit normalization, swallow-on-failure behavior, and validation rejection | 102 |
| tests/services/org-features.test.ts | Node test-runner coverage for default flag reads, audited toggles, and disabled-feature enforcement | 158 |
| tests/services/applications.test.ts | Coverage for createApplication, submitApplication (+ notification side effect), listApplications org-scoping | 178 |
| tests/services/tpn.test.ts | Coverage for captureTpnConsent, requestTpnCheck (stub refusal + adapter-backed create), recordTpnResult mapping, waiveTpnCheck | — |
| tests/services/vetting.test.ts | Coverage for approveApplication gating (TPN status/recommendation/consent/override), declineApplication, convertApplicationToTenant | — |
| tests/integration/applications.test.ts | Full lifecycle: create → submit → TPN PASS → approve → convert (+ waive path, DECLINE-blocks path) | — |
| tests/integration/payments.test.ts | End-to-end: markInvoicePaid → PaymentReceipt + Allocation + ledger entries; markInvoiceUnpaid reverses cleanly; `getTenantTrustPosition` balances to zero when fully allocated | 341 |
| tests/lib/crypto.test.ts | Round-trip encrypt/decrypt + tamper-detection cases for `lib/crypto.ts` | 63 |
| tests/lib/email.test.ts | Mailbox-config coverage for shared SMTP, legacy Gmail fallback, and per-mailbox credential overrides in `lib/email.ts` | 73 |
| tests/lib/statement-pdf.test.ts | Deterministic PDF buffer assertion for `renderStatementPdf` (same input ⇒ same bytes) | 78 |
| tests/lib/debit-order-instruction-pdf.test.ts | `renderDebitOrderInstruction` output contains expected bank ref, cap, and BANK_REF_PREFIX override | 53 |
| tests/integrations/qbo-mapping.test.ts | Fixture-based coverage for QBO → canonical `BankTransaction` mapper | 58 |
| tests/services/org-integrations.test.ts | connect → read → mark-error → disconnect lifecycle; ensures token ciphers are redacted on list | 196 |
| tests/services/utilities.test.ts | Meter CRUD, reading upserts, estimate fallbacks (ROLLING_AVG/ROLLOVER), tariff default + property override | 226 |
| tests/services/billing.test.ts | generate → rebuildTotals → publish → idempotent re-run; refuses publish when estimates gated and flag disabled | 271 |
| tests/services/payments.test.ts | Record → auto-allocate (oldest-first) → reverse (ADMIN allowed) → reverse (PM blocked post-30d); ledger side-effects | 395 |
| tests/services/payments-csv-import.test.ts | Generic CSV dialect parses rows, skips `(orgId, externalRef)` duplicates, emits structured skip reasons | 132 |
| tests/services/payments-csv-reference-matcher.test.ts | `${BANK_REF_PREFIX}${leaseId}` references auto-allocate to the right lease/invoice; respects BANK_REF_PREFIX env override | 218 |
| tests/services/trust.test.ts | Per-landlord isolation; portfolio rollup sums; entry refuses when `landlordId` mismatches parent `TrustAccount` | 212 |
| tests/services/statements.test.ts | Regeneration keeps `StatementLine` rows frozen while producing a fresh PDF; tenant/landlord/trust layouts covered | 424 |
| tests/services/reconciliations.test.ts | Seeded bank txn + matching receipt ⇒ zero exceptions; unmatched txn ⇒ `UNMATCHED_BANK_TX`; deterministic re-run | 239 |
| tests/services/stitch-payments.test.ts | Webhook HMAC verification success/failure; receipt creation + auto-allocation; 501 when unconfigured | 199 |
| tests/services/debicheck.test.ts | Cap-aware collection refusal; retry-state machine flips invoice to OVERDUE at day +2; mandate status transitions | 201 |
| tests/services/payouts.test.ts | Payout initiation persists external id on ledger entry; webhook flips pending → confirmed; signature verification | 154 |
| tests/services/qbo-adapter.test.ts | Adapter returns stub payload + throws `ApiError.conflict` when `QBO_CLIENT_ID` unset; OAuth callback persists OrgIntegration | 86 |
| tests/services/maintenance.test.ts | (M3) Vendor + lifecycle assignVendor → schedule → complete → captureMaintenanceInvoice writes a `FEE` ledger entry with `-invoiceCents` against the property's landlord | — |
| tests/services/vendors.test.ts | (M3) list/create/update/archive happy path + cross-org isolation | — |
| tests/services/inspections.test.ts | (M3) create → start → recordArea → recordItem → complete → sign; either-signer rule for MOVE_IN/MOVE_OUT, tenant-only for INTERIM | — |
| tests/services/offboarding.test.ts | (M3) seed default tasks (with/without UTILITIES_BILLING flag), idempotent open, charge add/remove gating, finalise no-charges → full refund + DEPOSIT_OUT, partial → partial refund, exceeding → balance owed + no ledger, second finalise rejected | — |
| tests/lib/blob-signed-url.test.ts | (M3) `createSignedUploadUrl` content-type allowlist, pathname traversal/leading-slash rejection, max-bytes cap, extension mapping | 70 |
| tests/reports/inspection-pdf.test.ts | (M3) `renderInspectionReport` deterministic — same fixture renders identical bytes | — |
| tests/reports/settlement-pdf.test.ts | (M3) `renderSettlementStatement` deterministic; balance-owed visibility gate; empty-charges fallback copy | 75 |
| tests/lib/financial-year.test.ts | Pure helper coverage for the fixed March-1 financial-year window, leap-year handling, and label formatting | 35 |
| tests/reports/tax-pack-pdf.test.ts | M5 deterministic coverage for `renderTaxPackPdf`, including the approved header/footer disclosure copy | 84 |
| tests/reports/tax-pack-csv.test.ts | M5 deterministic coverage for `renderTaxPackCsv`, row-expansion rules, and RFC 4180 escaping | 89 |
| tests/zod/tax-pack.test.ts | M5 schema coverage for pack-generation/regeneration inputs, including adapter-name pass-through | 28 |

### app/ — Layouts & Pages
| tests/lib/financial-year.test.ts | Pure helper coverage for the fixed March-1 financial-year window, leap-year handling, and label formatting | 35 |
| tests/reports/tax-pack-pdf.test.ts | M5 deterministic coverage for `renderTaxPackPdf`, including the approved header/footer disclosure copy | 84 |
| tests/reports/tax-pack-csv.test.ts | M5 deterministic coverage for `renderTaxPackCsv`, row-expansion rules, and RFC 4180 escaping | 89 |
| tests/zod/tax-pack.test.ts | M5 schema coverage for pack-generation/regeneration inputs, including adapter-name pass-through | 28 |

| Route | File | Purpose |
|-------|------|---------|
| — | app/layout.tsx | Root layout: metadata + `<Providers>` wrapper | 
| — | app/providers.tsx | Client: `<SessionProvider>` |
| / | (marketing)/page.tsx | Landing page with legitimacy-first copy, persona-led feature discovery, and contact-led CTA flow |
| — | (marketing)/layout.tsx | Public layout shell |
| /login | (marketing)/login/page.tsx | Renders `<LoginForm>` in Suspense |
| — | (staff)/layout.tsx | Auth guard + `<StaffNav>` |
| — | (staff)/dashboard/layout.tsx | Wraps all `/dashboard/*` routes with `DashboardShell` (sticky tab bar + range/compare URL filters) |
| /dashboard | (staff)/dashboard/page.tsx | Staff Overview: 7-KPI hero band with sparklines, Invoiced-vs-Collected combo chart with prior-period overlay, status strip, map + ranked lists, maintenance-by-status; threads AnalyticsCtx from URL search params |
| /dashboard/tenants | (staff)/dashboard/tenants/page.tsx | Tab stub — Phase 4 placeholder |
| /dashboard/utilities | (staff)/dashboard/utilities/page.tsx | Tab stub — Phase 4 placeholder |
| /dashboard/trust | (staff)/dashboard/trust/page.tsx | Tab stub — Phase 4 placeholder |
| /properties | (staff)/properties/page.tsx | Property list |
| /properties/new | (staff)/properties/new/page.tsx | Create property form |
| /properties/[id] | (staff)/properties/[id]/page.tsx | Property detail + units list |
| /properties/[id]/edit | (staff)/properties/[id]/edit/page.tsx | Edit property form |
| /properties/[id] | (staff)/properties/[id]/delete-button.tsx | Client: delete with confirmation |
| /properties/[id]/units/new | (staff)/properties/[id]/units/new/page.tsx | Create unit in property |
| /units/[id] | (staff)/units/[id]/page.tsx | Unit detail + lease history |
| /tenants | (staff)/tenants/page.tsx | Tenant list |
| /tenants/new | (staff)/tenants/new/page.tsx | Create tenant form |
| /tenants/onboard | (staff)/tenants/onboard/page.tsx | Single-screen wizard: tenant + unit assignment + draft lease + portal invite |
| /tenants/[id] | (staff)/tenants/[id]/page.tsx | Tenant detail + lease history |
| /tenants/[id] | (staff)/tenants/[id]/archive-button.tsx | Client: archive/unarchive |
| /tenants/[id] | (staff)/tenants/[id]/delete-button.tsx | Client: permanently delete archived tenant (typed-name confirmation) |
| /tenants/[id] | (staff)/tenants/[id]/invite-button.tsx | Client: invite tenant to portal, shows one-time temp password |
| /leases | (staff)/leases/page.tsx | Lease list with status filters |
| /leases/new | (staff)/leases/new/page.tsx | Create lease form |
| /leases/[id] | (staff)/leases/[id]/page.tsx | Lease detail |
| /leases/[id] | (staff)/leases/[id]/actions.tsx | Client: activate/terminate/renew buttons |
| /leases/[id] | (staff)/leases/[id]/document-upload.tsx | Client: upload lease doc |
| /leases/[id]/renew | (staff)/leases/[id]/renew/page.tsx | Renew lease (pre-filled) |
| /profile | (staff)/profile/page.tsx | User profile + password change |
| /settings/org | (staff)/settings/org/page.tsx | Org settings page |
| /settings/org | (staff)/settings/org/org-form.tsx | Client: org settings form |
| /settings/features | (staff)/settings/features/page.tsx | Feature flag settings page (ADMIN only) |
| /settings/features | (staff)/settings/features/feature-flags-form.tsx | Client: feature toggle list for workspace modules |
| /settings/team | (staff)/settings/team/page.tsx | Team management page |
| /settings/team | (staff)/settings/team/new-user-form.tsx | Client: new team member form |
| /settings/team | (staff)/settings/team/team-row.tsx | Client: team member row |
| /reports/year-end | (staff)/reports/year-end/page.tsx | Financial-year admin surface: open years, lock completed years, and generate annual reconciliations by org/property/landlord scope |
| /reports/tax-packs | (staff)/reports/tax-packs/page.tsx | Staff tax-pack workspace: choose year, generate landlord/tenant packs, and regenerate PDF/CSV artefacts |
| /settings/backup | (staff)/settings/backup/page.tsx | ADMIN-only backup posture page with latest snapshot/verification state, RPO/RTO disclosure, and manual run/verify actions |
| — | (tenant)/layout.tsx | Tenant auth guard + TenantSidebar + TopBar shell |
| /tenant | (tenant)/tenant/page.tsx | Tenant home: active lease card, renewal banner, recent documents |
| /tenant/lease | (tenant)/tenant/lease/page.tsx | Full active lease detail + document list + previous leases |
| /tenant/documents | (tenant)/tenant/documents/page.tsx | All documents available to tenant |
| /tenant/profile | (tenant)/tenant/profile/page.tsx | Tenant contact info (read-only) + change password |
| /tenant/repairs | (tenant)/tenant/repairs/page.tsx | List of tenant's maintenance requests |
| /tenant/repairs/new | (tenant)/tenant/repairs/new/page.tsx | Submit a repair request |
| /tenant/repairs/[id] | (tenant)/tenant/repairs/[id]/page.tsx | Tenant view of a request |
| /tenant/invoices | (tenant)/tenant/invoices/page.tsx | Rent invoices: next due, history, paid total |
| /maintenance | (staff)/maintenance/page.tsx | Staff maintenance list with status filters |
| /maintenance/[id] | (staff)/maintenance/[id]/page.tsx | Staff detail with dispatch (assign vendor / quote / schedule / complete / capture invoice) panels, quotes list, worklog feed |
| /maintenance/[id] | (staff)/maintenance/[id]/update-form.tsx | Client: status/priority/notes form |
| /maintenance/vendors | (staff)/maintenance/vendors/page.tsx | Vendor directory list with archived filter |
| /maintenance/vendors/new | (staff)/maintenance/vendors/new/page.tsx | Create vendor form |
| /maintenance/vendors/[id] | (staff)/maintenance/vendors/[id]/page.tsx | Edit vendor + archive/unarchive |
| /inspections | (staff)/inspections/page.tsx | Inspections list with status/type filters |
| /inspections/[id] | (staff)/inspections/[id]/page.tsx | Inspection detail: areas/items editor, photo uploader (signed-URL flow), complete + sign CTAs, PDF link |
| /leases/[id]/move-in | (staff)/leases/[id]/move-in/page.tsx | Server gateway: ensures a MOVE_IN inspection exists, redirects to /inspections/[id] |
| /leases/[id]/move-out | (staff)/leases/[id]/move-out/page.tsx | Server gateway: ensures a MOVE_OUT inspection exists, redirects to /inspections/[id] |
| /offboarding | (staff)/offboarding/page.tsx | Offboarding cases list with status pills |
| /offboarding/[id] | (staff)/offboarding/[id]/page.tsx | Case detail: tasks checklist, charges add/remove, settlement preview, finalise CTA, PDF link, close case |
| /applications | (staff)/applications/page.tsx | Application list with stage tabs, reviewer filter, search; loading skeleton + empty state |
| /applications/new | (staff)/applications/new/page.tsx | Capture form for new applicant + application + TPN consent |
| /applications/[id] | (staff)/applications/[id]/page.tsx | Tabbed detail (Overview / TPN / Documents / Notes) with decision CTAs and convert dialog |
| /leases/[id] | (staff)/leases/[id]/invoices-panel.tsx | Client: mark-paid / unpay actions per invoice |
| /leases/[id] | (staff)/leases/[id]/signatures-panel.tsx | Client: signatures list + review requests with respond (accept/reject/resolve + pmResponse) |
| /tenant/lease | (tenant)/tenant/lease/sign-card.tsx | Client: `SignLeaseCard` (typed name + geolocation + agreement) and `SignedConfirmation` |
| /tenant/lease | (tenant)/tenant/lease/review-form.tsx | Client: `ReviewRequestForm` (clause + note) and `ReviewRequestList` |
| - | (landlord)/layout.tsx | Landlord auth guard + `DesktopLandlordSidebar` shell |
| /landlord | (landlord)/landlord/page.tsx | Landlord dashboard with portfolio summary cards and assigned property list |
| - | (agent)/layout.tsx | Managing-agent auth guard + `DesktopAgentSidebar` shell |
| /agent | (agent)/agent/page.tsx | Managing-agent dashboard with placeholder approvals, property, and alerts summary |
| /signup | (marketing)/signup/page.tsx | Public signup request form (marketing) |
| /about | (marketing)/about/page.tsx | Marketing — about page |
| /product | (marketing)/product/page.tsx | Marketing — product overview |
| /pricing | (marketing)/pricing/page.tsx | Marketing — pricing tiers |
| /contact | (marketing)/contact/page.tsx | Marketing — contact form |
| /legal/privacy | (marketing)/legal/privacy/page.tsx | Marketing — privacy policy |
| /legal/terms | (marketing)/legal/terms/page.tsx | Marketing — terms of service |
| /settings/integrations | (staff)/settings/integrations/page.tsx | ADMIN-only provider list (Stitch payments/DebiCheck/payouts, QBO, TPN) with status pills + connect/disconnect |
| /settings/integrations | (staff)/settings/integrations/connect-modal.tsx | Client: per-provider connect flow (Stitch white-label partner URL / Intuit OAuth + QBO signup affiliate link / TPN API-key form) |
| /billing | (staff)/billing/page.tsx | Billing runs list with period, status pills, "Generate run" primary action |
| /billing/new | (staff)/billing/new/page.tsx | Period picker form; POSTs to `/api/billing/runs` |
| /billing/new | (staff)/billing/new/period-form.tsx | Client: period-picker form |
| /billing/runs/[id] | (staff)/billing/runs/[id]/page.tsx | Run detail: invoices table + line-item drawer, estimate badges, Publish CTA |
| /billing/runs/[id] | (staff)/billing/runs/[id]/invoice-row.tsx | Client: expandable invoice row with line items |
| /billing/runs/[id] | (staff)/billing/runs/[id]/publish-button.tsx | Client: publish run action (disabled when estimate-gated) |
| /utilities/meters | (staff)/utilities/meters/page.tsx | Meter list with property/unit/type filters |
| /utilities/meters/new | (staff)/utilities/meters/new/page.tsx | Create meter form |
| /utilities/meters/[id] | (staff)/utilities/meters/[id]/page.tsx | Meter detail + readings history + "Record reading" form |
| /utilities/readings | (staff)/utilities/readings/page.tsx | Org-wide meter-reading index with filters |
| /utilities/tariffs | (staff)/utilities/tariffs/page.tsx | Tariff list + upsert form (org-wide default + optional property override) |
| /payments | (staff)/payments/page.tsx | Receipts list with filters (tenant, lease, date, source, allocated-status) |
| /payments/[id] | (staff)/payments/[id]/page.tsx | Receipt detail + allocations + allocate/reverse dialogs |
| /payments/import | (staff)/payments/import/page.tsx | Bank-CSV dialect picker + file upload + preview |
| /trust | (staff)/trust/page.tsx | Portfolio trust balance with per-landlord breakdown; disburse CTA; exceptions count pill |
| /trust/landlords/[landlordId] | (staff)/trust/landlords/[landlordId]/page.tsx | Per-landlord ledger entries + running balance |
| /trust | (staff)/trust/disburse-dialog.tsx | Client: landlord picker + amount + note; POSTs to `/api/trust/disbursements` |
| /trust/reconciliations | (staff)/trust/reconciliations/page.tsx | Reconciliation runs list |
| /trust/reconciliations/[id] | (staff)/trust/reconciliations/[id]/page.tsx | Reconciliation run detail with exceptions table + resolve |
| /trust/reconciliations/[id] | (staff)/trust/reconciliations/[id]/resolve-button.tsx | Client: resolve-exception action with note |
| /statements | (staff)/statements/page.tsx | Statements list with type/subject/period filters; generate CTA |
| /statements | (staff)/statements/generate-form.tsx | Client: shared generate form used by index + subject pages |
| /statements/tenants/[id] | (staff)/statements/tenants/[id]/page.tsx | Tenant statement index + generate form |
| /statements/landlords/[id] | (staff)/statements/landlords/[id]/page.tsx | Landlord statement index + generate form |
| /statements/[id] | (staff)/statements/[id]/page.tsx | Statement detail with download link |
| /statements/[id] | (staff)/statements/[id]/regenerate-button.tsx | Client: regenerate PDF while keeping `StatementLine` rows frozen |
| /landlord/invoices | (landlord)/landlord/invoices/page.tsx | Landlord sees own invoices rolled up per property |
| /landlord/statements | (landlord)/landlord/statements/page.tsx | Landlord sees own statements; no cross-landlord leakage |
| /landlord/reports | (landlord)/landlord/reports/page.tsx | Landlord tax-pack index scoped to the signed-in landlord, grouped by financial year |
| /landlord/reports/[yearId] | (landlord)/landlord/reports/[yearId]/page.tsx | Landlord pack detail with year totals, line items, and PDF/CSV download links |
| /tenant/invoices/[id] | (tenant)/tenant/invoices/[id]/page.tsx | Itemised invoice with rent/utilities groupings, totals, pay-rail cards |
| /tenant/invoices/[id] | (tenant)/tenant/invoices/[id]/pay-button.tsx | Client: POSTs `/api/payments/stitch/checkout`, redirects to Stitch hosted checkout |
| /tenant/payments | (tenant)/tenant/payments/page.tsx | Rails overview: active payment methods + "Set up new method" actions |
| /tenant/payments | (tenant)/tenant/payments/debicheck-card.tsx | Client: "Sign DebiCheck mandate in your banking app" + status pill |
| /tenant/payments | (tenant)/tenant/payments/self-managed-card.tsx | Client: download instruction PDF; shows "Debit order active (self-managed)" pill |
| /tenant/reports | (tenant)/tenant/reports/page.tsx | Tenant tax-pack index scoped to the signed-in tenant, grouped by financial year |
| /tenant/reports/[yearId] | (tenant)/tenant/reports/[yearId]/page.tsx | Tenant pack detail with annual totals, support lines, and PDF/CSV download links |
| /tenant/inspections | (tenant)/tenant/inspections/page.tsx | Tenant inspections list scoped to tenant's leases |
| /tenant/inspections/[id] | (tenant)/tenant/inspections/[id]/page.tsx | Tenant inspection view + sign action (TENANT signature flips MOVE_IN/MOVE_OUT to SIGNED_OFF; required for INTERIM) |

### app/api/ — Route Handlers
| Endpoint | Methods | Handler calls |
|----------|---------|--------------|
| /api/auth/[...nextauth] | GET, POST | handlers (NextAuth) |
| /api/dashboard/summary | GET | getDashboardSummary |
| /api/properties | GET, POST | listProperties, createProperty |
| /api/properties/[id] | GET, PATCH, DELETE | getProperty, updateProperty, softDeleteProperty |
| /api/units | GET, POST | listUnits, createUnit |
| /api/units/[id] | GET, PATCH, DELETE | getUnit, updateUnit, deleteUnit |
| /api/tenants | GET, POST | listTenants, createTenant |
| /api/tenants/[id] | GET, PATCH, DELETE | getTenant, updateTenant, deleteTenant (hard delete — archived only) |
| /api/tenants/[id]/archive | POST | archiveTenant/unarchiveTenant |
| /api/tenants/[id]/invite | POST | inviteTenantToPortal (ADMIN/PM only) |
| /api/maintenance | GET, POST | listMaintenanceRequests (staff), createTenantMaintenanceRequest (tenant) |
| /api/maintenance/[id] | GET, PATCH | getMaintenanceRequest, updateMaintenanceRequest (ADMIN/PM only) |
| /api/maintenance/[id]/assign | POST | assignVendor (ADMIN/PM) |
| /api/maintenance/[id]/quotes | GET, POST | list quotes, captureQuote (ADMIN/PM) |
| /api/maintenance/[id]/schedule | POST | scheduleMaintenance (ADMIN/PM) |
| /api/maintenance/[id]/complete | POST | completeMaintenance (ADMIN/PM) |
| /api/maintenance/[id]/invoice | POST | captureMaintenanceInvoice (ADMIN/PM/FINANCE) — writes FEE ledger entry against landlord |
| /api/maintenance/[id]/worklogs | GET, POST | list, addMaintenanceWorklog (ADMIN/PM) |
| /api/vendors | GET, POST | listVendors, createVendor (ADMIN/PM) |
| /api/vendors/[id] | GET, PATCH, DELETE | getVendor, updateVendor, archiveVendor (ADMIN/PM) |
| /api/inspections | GET, POST | listInspections, createInspection (ADMIN/PM) |
| /api/inspections/[id] | GET, PATCH | getInspection, updateInspection (ADMIN/PM) |
| /api/inspections/[id]/start | POST | startInspection (ADMIN/PM) |
| /api/inspections/[id]/complete | POST | completeInspection (ADMIN/PM) |
| /api/inspections/[id]/sign | POST | signInspection (ADMIN/PM/LANDLORD/TENANT — TENANT only when inspection's lease matches) |
| /api/inspections/[id]/areas | POST | recordArea (ADMIN/PM) |
| /api/inspection-areas/[id]/items | POST | recordItem (ADMIN/PM) |
| /api/inspection-items/[id]/photos | POST | register `InspectionPhoto` after client upload (ADMIN/PM/TENANT) |
| /api/inspection-items/[id]/photos/signed-url | POST | issue scoped client upload URL (ADMIN/PM/TENANT) |
| /api/inspection-items/[id]/photos/[photoId] | DELETE | remove photo row (ADMIN/PM) |
| /api/uploads/blob/[...storageKey] | PUT | direct-Blob upload proxy; auth-gated; org-scoped pathname; png/jpeg/webp only |
| /api/leases/[id]/debit-order-instruction.pdf | GET | renderDebitOrderInstruction (M2 — referenced by tenant rail B(ii)) |
| /api/offboarding | GET, POST | listOffboardingCases, openOffboardingCase (ADMIN/PM) |
| /api/offboarding/[id] | GET | getOffboardingCase (ADMIN/PM/TENANT — own lease) |
| /api/offboarding/[id]/tasks/[taskId] | PATCH | toggleOffboardingTask (ADMIN/PM) |
| /api/offboarding/[id]/charges | GET, POST | list, addMoveOutCharge (ADMIN/PM) — refused after finalisation |
| /api/offboarding/[id]/charges/[chargeId] | DELETE | removeMoveOutCharge (ADMIN/PM) — refused after finalisation |
| /api/offboarding/[id]/finalise | POST | finaliseDepositSettlement (ADMIN/PM/FINANCE) — immutable, writes DEPOSIT_OUT ledger entry when refund > 0 |
| /api/offboarding/[id]/close | POST | closeOffboardingCase (ADMIN/PM) |
| /api/invoices/[id]/paid | POST, DELETE | markInvoicePaid, markInvoiceUnpaid (ADMIN/PM/FINANCE) |
| /api/leases/[id]/sign | POST | signLeaseAsTenant (TENANT only; records IP/UA from request headers) |
| /api/leases/[id]/review-requests | POST | createReviewRequest (TENANT only) |
| /api/review-requests/[id] | PATCH | respondToReviewRequest (ADMIN/PM only) |
| /api/onboarding/tenants | POST | onboardTenant (ADMIN/PM only) — creates tenant + draft lease + optional portal user |
| /api/leases | GET, POST | listLeases, createLease |
| /api/leases/[id] | GET, PATCH | getLease, updateDraftLease |
| /api/leases/[id]/activate | POST | activateLease |
| /api/leases/[id]/terminate | POST | terminateLease |
| /api/leases/[id]/renew | POST | renewLease |
| /api/leases/[id]/primary-tenant | POST | setPrimaryTenant |
| /api/leases/[id]/documents | POST | uploadLeaseAgreement |
| /api/documents/[id]/download | GET | role-dispatch: `getTenantDocumentForDownload` for TENANT, `getDocumentForDownload` otherwise |
| /api/profile/password | POST | changeOwnPassword |
| /api/settings/org | GET, PATCH | getOrg, updateOrg |
| /api/settings/features | GET, POST | getOrgFeatures, setOrgFeature |
| /api/settings/team | GET, POST | listTeam, createTeamUser |
| /api/settings/team/[id] | PATCH | updateTeamUser |
| /api/applications | GET, POST | listApplications, createApplication |
| /api/applications/[id] | GET, PATCH | getApplication, updateApplication |
| /api/applications/[id]/submit | POST | submitApplication |
| /api/applications/[id]/withdraw | POST | withdrawApplication |
| /api/applications/[id]/approve | POST | approveApplication (ADMIN/PM) — enforces TPN/consent gates |
| /api/applications/[id]/decline | POST | declineApplication (ADMIN/PM) |
| /api/applications/[id]/convert | POST | convertApplicationToTenant — creates Tenant + DRAFT Lease |
| /api/applications/[id]/consent | POST | captureTpnConsent — records applicant TPN consent |
| /api/applications/[id]/assign | POST | assignReviewer |
| /api/applications/[id]/notes | POST | addApplicationNote |
| /api/applications/[id]/documents | POST | uploadApplicationDocument (multipart) |
| /api/applications/[id]/tpn/request | POST | requestTpnCheck — calls TPN adapter |
| /api/applications/[id]/tpn/waive | POST | waiveTpnCheck (audited reason) |
| /api/integrations/tpn/webhook | POST | recordTpnResult — signature-verified; returns 501 in stub mode |
| /api/settings/integrations | GET | listOrgIntegrations (ADMIN only; token ciphers redacted) |
| /api/settings/integrations/[provider] | DELETE | disconnectOrgIntegration |
| /api/utilities/meters | GET, POST | listMeters, createMeter (ADMIN/PM/FINANCE) |
| /api/utilities/meters/[id] | GET | getMeter |
| /api/utilities/meters/[id]/readings | POST | recordMeterReading |
| /api/utilities/tariffs | GET, POST | listTariffs, upsertTariff |
| /api/billing/runs | GET, POST | listBillingRuns, generateBillingRun |
| /api/billing/runs/[id] | GET | getBillingRun |
| /api/billing/runs/[id]/publish | POST | publishBillingRun |
| /api/invoices/[id]/line-items | POST | addManualLineItem |
| /api/invoices/line-items/[id] | DELETE | removeLineItem |
| /api/payments | GET, POST | listReceipts, recordIncomingPayment |
| /api/payments/[id] | GET | getReceipt |
| /api/payments/[id]/allocate | POST | allocateReceipt (auto-oldest-first default; manual override) |
| /api/allocations/[id]/reverse | POST | reverseAllocation (30-day gate for non-ADMIN, audited) |
| /api/payments/import | POST | importReceiptsCsv (multipart; dialect-aware) |
| /api/payments/stitch/checkout | POST | initiateInboundPayment (TENANT) — returns `{ redirectUrl }` |
| /api/integrations/stitch/callback | POST | persists `OrgIntegration` rows after Stitch Connect returns (payments/DebiCheck/payouts) |
| /api/integrations/stitch/webhook | POST | handleStitchWebhook (HMAC-verified; returns 501 when no org has STITCH_PAYMENTS) |
| /api/integrations/stitch/debicheck/mandate | POST | createMandateRequest (staff) |
| /api/integrations/stitch/debicheck/webhook | POST | applyMandateWebhookStatus + collection webhook (HMAC-verified) |
| /api/integrations/stitch/payouts/webhook | POST | handlePayoutWebhook (flips pending ledger entries to confirmed) |
| /api/integrations/qbo/callback | POST | qboAdapter.connectOAuth — persists `OrgIntegration { provider: QUICKBOOKS }` |
| /api/trust/disbursements | POST | disburseToLandlord (wires through `stitchPayoutsAdapter.initiatePayout`) |
| /api/reconciliations | GET, POST | listReconciliationRuns, runTrustReconciliation |
| /api/reconciliations/exceptions/[id]/resolve | POST | resolveException |
| /api/statements/tenants/[id] | GET, POST | list / generateTenantStatement |
| /api/statements/landlords/[id] | GET, POST | list / generateLandlordStatement |
| /api/statements/trust/[landlordId] | POST | generateTrustStatement (per-landlord) |
| /api/statements/[id]/regenerate | POST | regenerateStatement (fresh PDF; lines frozen) |
| /api/statements/[id]/download | GET | streams statement PDF from Blob |
| /api/year-ends | GET, POST | listYears, openYear |
| /api/year-ends/[id]/lock | POST | lockYear (ADMIN only) |
| /api/reports/annual-recon | GET, POST | list scoped annual reconciliations, generateAnnualReconciliation |
| /api/reports/tax-packs/landlords/[id] | POST | generateLandlordTaxPack |
| /api/reports/tax-packs/tenants/[id] | POST | generateTenantTaxPack |
| /api/reports/tax-packs/[packId] | GET | getPackOrThrow |
| /api/reports/tax-packs/[packId]/pdf | GET | streams tax-pack PDF from Blob |
| /api/reports/tax-packs/[packId]/csv | GET | streams tax-pack CSV from Blob |
| /api/reports/tax-packs/[packId]/regenerate-pdf | POST | regenerateTaxPackPdf (ADMIN/PROPERTY_MANAGER) |
| /api/reports/tax-packs/[packId]/regenerate-csv | POST | regenerateTaxPackCsv (ADMIN/PROPERTY_MANAGER) |
| /api/settings/backup/run | POST | runDailyBackup (ADMIN only) |
| /api/settings/backup/verify | POST | runVerification (ADMIN only) |
| /api/cron/backup-daily | POST | `CRON_SECRET`-guarded org-wide backup run: `runDailyBackup`, `runBlobIndex`, `pruneOldBackups` |
| /api/cron/backup-verify | POST | `CRON_SECRET`-guarded org-wide restore smoke test via `runVerification` |
| /api/cron/reconciliation | GET | Vercel cron — runs `runTrustReconciliation` for every QBO-connected org at 06:00 + 18:00 SAST; noop when `QBO_CLIENT_ID` unset |
| /api/cron/debicheck-retry | GET | Vercel cron — walks failed-but-retryable DebiCheck collections and runs `retryUnpaidCollection` (02:00 SAST) |
| /api/cron/notifications-dispatch | POST | `CRON_SECRET`-guarded dispatcher for queued `NotificationDelivery` rows |
| /api/cron/payment-alerts | POST | `CRON_SECRET`-guarded daily payment alert evaluator for orgs with `PAYMENT_ALERTS` enabled |
| /api/cron/usage-alerts | POST | `CRON_SECRET`-guarded daily usage alert evaluator for orgs with `USAGE_ALERTS` enabled |
| /api/cron/eskom-sync | POST | `CRON_SECRET`-guarded daily EskomSePush outage sync for CONNECTED org integrations |
| /api/notifications | GET | current-user notification inbox (`listNotificationsForUser`) |
| /api/notifications/[id]/read | PATCH | marks an owned notification as read |
| /api/notices | GET, POST | list org notices / create draft notice (ADMIN, PROPERTY_MANAGER, MANAGING_AGENT) |
| /api/notices/[id] | GET | fetch one notice with audience-scope enforcement |
| /api/notices/[id]/publish | POST | publish + dispatch a notice (ADMIN, PROPERTY_MANAGER, MANAGING_AGENT) |
| /api/notices/[id]/dispatch | POST | manual notice redispatch for admins/property managers |
| /api/outages | GET, POST | list scoped outages / create PM outage (POST: ADMIN, PROPERTY_MANAGER, MANAGING_AGENT) |
| /api/outages/[id] | GET, DELETE | fetch scoped outage / delete PM-created outage (DELETE: ADMIN, PROPERTY_MANAGER) |
| /api/tenant/debicheck/mandate-request | POST | TENANT-initiated mandate request; calls `createMandateRequest` |
| /api/leases/[id]/debit-order-instruction.pdf | GET | renderDebitOrderInstruction (staff + tenant self) — streams PDF |
| /api/leases/[id]/self-managed-debit-order | POST | toggles `Lease.selfManagedDebitOrderActive` |
| /api/public/signup-request | POST | Public marketing signup-request intake; emails `OPS_EMAIL_RECIPIENTS` |
| /api/public/contact | POST | Public marketing contact-form intake; emails `OPS_EMAIL_RECIPIENTS` |

### components/
| File | Type | Exports | Lines |
|------|------|---------|-------|
| login-form.tsx | Client | `LoginForm` — email/password, signIn + redirect | 70 |
| lease-status-badge.tsx | Server | `LeaseStatusBadge` — color-coded status with dot (DRAFT/ACTIVE/EXPIRING/EXPIRED/TERMINATED/RENEWED) | 28 |
| occupancy-badge.tsx | Server | `OccupancyBadge` — color-coded occupancy with dot (VACANT/OCCUPIED/UPCOMING/CONFLICT) | 26 |
| nav/sidebar.tsx | Client | `Sidebar` — staff left nav with lucide icons, active-state highlight | 56 |
| nav/tenant-sidebar.tsx | Client | `TenantSidebar` — tenant left nav (Home/Lease/Documents/Profile) | 46 |
| nav/top-bar.tsx | Server | `TopBar` — top bar: profile link + signOut (shared by staff + tenant) | 27 |
| nav/staff-nav.tsx | Server | (unused — superseded by sidebar + top-bar) | 30 |
| forms/lease-form.tsx | Client | `LeaseForm` — unit, tenants, dates, rent, deposit, notes | 189 |
| forms/property-form.tsx | Client | `PropertyForm` — name, address fields, province, autoCreateMainUnit | 112 |
| forms/unit-form.tsx | Client | `UnitForm` — property, label, bedrooms, bathrooms, size | 59 |
| forms/tenant-form.tsx | Client | `TenantForm` — name, email, phone, ID, duplicate detection | 90 |
| forms/change-password-form.tsx | Client | `ChangePasswordForm` — current + new + confirm | 47 |
| forms/onboard-tenant-form.tsx | Client | `OnboardTenantForm` — full wizard form, POSTs to /api/onboarding/tenants, displays temp password result | — |
| forms/application-form.tsx | Client | `ApplicationForm` — applicant + application + TPN consent capture, POSTs to /api/applications | — |
| forms/application-detail-actions.tsx | Client | `ApplicationDetailActions` (overview/tpn modes), `ApplicationDocumentsPanel`, `ApplicationNotesPanel` — decision dialogs (approve/decline/withdraw), TPN actions (consent/request/waive/retry), document + note submission | — |
| forms/convert-application-dialog.tsx | Client | `ConvertApplicationDialog` — collects lease terms + portal-user toggle, POSTs to /api/applications/[id]/convert, shows temp password and redirects to tenant | — |
| lease-agreement-document.tsx | Server | `LeaseAgreementDocument` — scrollable rendered lease from `renderLeaseAgreement()` | — |
| ui/* | Client | shadcn/base-ui primitives: badge, button, card, checkbox, dialog, input, label, select, separator, switch, table, textarea, skeleton | ~900 |
| marketing/marketing-header.tsx | Client | `MarketingHeader` — top nav shell for marketing pages with responsive drawer | 129 |
| marketing/marketing-footer.tsx | Server | `MarketingFooter` — marketing footer with links + legal | 107 |
| marketing/contact-form.tsx | Client | `ContactForm` — POSTs to `/api/public/contact` | 122 |
| marketing/persona-value-grid.tsx | Client | `PersonaValueGrid` — four audience-selector cards that expand in-place into role-specific value-prop blocks on click | 302 |
| signup-form.tsx | Client | `SignupForm` — marketing `/signup` request form, POSTs to `/api/public/signup-request` | 249 |
| forms/meter-form.tsx | Client | `MeterForm` — property/unit/type/serial create form | 100 |
| forms/meter-reading-form.tsx | Client | `MeterReadingForm` — takenAt + readingValue + source | 85 |
| forms/utility-tariff-form.tsx | Client | `UtilityTariffForm` — upsert tariff (flat or tiered), org default or property override | 113 |
| forms/allocation-dialog.tsx | Client | `AllocationDialog` — allocate receipt to invoice line items, oldest-first default with manual override | 148 |
| forms/reverse-allocation-dialog.tsx | Client | `ReverseAllocationDialog` — captures reason; enforces 30-day gate for non-ADMIN | 97 |
| forms/payment-csv-import-form.tsx | Client | `PaymentCsvImportForm` — dialect picker + multipart upload + preview table | 189 |
| forms/vendor-form.tsx | Client | `VendorForm`, `ArchiveVendorButton` — create/update + archive control | — |
| forms/assign-vendor-dialog.tsx | Client | `AssignVendorDialog` — vendor picker + estimate + scheduledFor | — |
| forms/capture-quote-dialog.tsx | Client | `CaptureQuoteDialog` — vendor + amount + storage key + note | — |
| forms/capture-invoice-dialog.tsx | Client | `CaptureInvoiceDialog` — invoice amount + blob key (M3: ledger entry on submit) | — |
| forms/maintenance-worklog-form.tsx | Client | `MaintenanceWorklogForm`, `ScheduleButton`, `CompleteForm` — worklog comment box + schedule/complete actions | — |
| forms/inspection-area-form.tsx | Client | `InspectionAreaForm` — add area to inspection | 64 |
| forms/inspection-item-form.tsx | Client | `InspectionItemForm` — label + condition + note + estimated cost + responsibility | — |
| forms/inspection-sign-dialog.tsx | Client | `InspectionSignDialog` — typed name + role; either-signer rule fires SIGNED_OFF transition server-side | — |
| forms/inspection-photo-uploader.tsx | Client | `InspectionPhotoUploader` — signed-URL flow: requests scoped upload URL → PUTs file → registers `InspectionPhoto` row | 90 |
| forms/offboarding-task-toggle.tsx | Client | `OffboardingTaskToggle` — checkbox calling `/api/offboarding/[id]/tasks/[taskId]` | — |
| forms/move-out-charge-form.tsx | Client | `MoveOutChargeForm`, `RemoveChargeButton` — charge entry + removal (gated when settlement finalised) | — |
| forms/finalise-settlement-button.tsx | Client | `FinaliseSettlementButton` — confirms then POSTs to `/api/offboarding/[id]/finalise` | — |
| forms/close-case-button.tsx | Client | `CloseCaseButton` — POSTs to `/api/offboarding/[id]/close` | — |
 
**Manifest refresh (2026-04-22) — supersedes older line counts above where duplicated**

| File | Type | Exports | Lines |
|------|------|---------|-------|
| empty-state.tsx | Client | `EmptyState` — shared empty-state panel with optional icon + action | 43 |
| page-header.tsx | Client | `PageHeader` — shared eyebrow/title/description/action header shell | 46 |
| stat-card.tsx | Client | `StatTone`, `StatCard` — editorial metric card with left accent rail | 64 |
| lease-status-badge.tsx | Server | `LeaseStatusBadge` — lease state pill with editorial status colours | 39 |
| occupancy-badge.tsx | Server | `OccupancyBadge` — occupancy pill (VACANT/OCCUPIED/UPCOMING/CONFLICT) | 33 |
| maintenance-badges.tsx | Server | `MaintenanceStatusBadge`, `MaintenancePriorityBadge` — maintenance status/priority pills | 36 |
| nav/breadcrumbs.tsx | Client | `Breadcrumbs` — pathname-based breadcrumb trail for internal layouts | 70 |
| nav/mobile-nav.tsx | Client | `MobileNav` — mobile drawer nav wrapper around `SidebarBody` | 97 |
| nav/sidebar.tsx | Client | `getStaffNavItems()`, `Sidebar`, `SidebarBody`, `DesktopSidebar` — shared editorial sidebar shell for portal nav, incl. year-end, tax-pack, and admin backup destinations | 193 |
| nav/tenant-sidebar.tsx | Client | `getTenantNavItems()`, `TenantSidebar`, `DesktopTenantSidebar` — tenant portal nav config + wrappers, now including `/tenant/reports` | 32 |
| nav/agent-sidebar.tsx | Client | `getAgentNavItems()`, `AgentSidebar`, `DesktopAgentSidebar` — agent portal nav config + wrappers (dashboard-only until more routes land) | 29 |
| nav/landlord-sidebar.tsx | Client | `getLandlordNavItems()`, `LandlordSidebar`, `DesktopLandlordSidebar` — landlord portal nav config + wrappers for dashboard, invoices, statements, and reports | 29 |
| nav/top-bar.tsx | Server | `TopBar` — internal top bar with breadcrumbs, theme toggle, account, sign out | 53 |

**Marketing refresh (2026-04-23) - supersedes older marketing route/component entries above where duplicated**
| Route / File | Purpose / Export | Lines |
|--------------|------------------|-------|
| /about | Marketing about page with company context and guided next-read links | 226 |
| /product | Marketing product overview with section anchors and guided next-read links | 289 |
| /pricing | Marketing pricing overview with scoped profiles, FAQs, and guided next-read links | 312 |
| /contact | Marketing contact page with direct form and guided pre-contact links | 181 |
| components/marketing/marketing-footer.tsx | `MarketingFooter` - anchor-based exploration links + legal | 109 |
| components/marketing/contact-form.tsx | `ContactForm` - POSTs to `/api/public/contact` | 135 |
| components/marketing/marketing-journey-grid.tsx | `MarketingJourneyGrid` - reusable high-signal read-next card grid for marketing pages | 83 |
| components/signup-form.tsx | `SignupForm` - marketing `/signup` request form, POSTs to `/api/public/signup-request` | 244 |

**M4 refresh (2026-04-24) - supersedes older entries above where duplicated**
| File / Route | Purpose / Export | Lines |
|--------------|------------------|-------|
| app/layout.tsx | Root layout now imports Leaflet CSS alongside global app CSS before rendering `<Providers>` | 23 |
| lib/services/snapshots.ts | `SnapshotEventKind`, `recordSnapshotEvent(ctx, kind, refs?)`, `recomputeOrgSnapshot()`, `recomputePropertySnapshot()`, `recomputeLandlordSnapshot()`, `recomputeAgentSnapshot()`, `monthFloor()`, `__setSnapshotEventHandlerForTests()` - monthly snapshot recompute helpers plus a test override hook for wiring assertions | 411 |
| lib/services/leases.ts | Lease lifecycle service; `activateLease()`, `terminateLease()`, and `renewLease()` now also trigger `recordSnapshotEvent('LEASE_STATE')` with property/landlord/agent refs | 418 |
| lib/services/payments.ts | Receipts + allocations service; `recordIncomingPayment()`, `allocateReceipt()`, and `reverseAllocation()` now also trigger snapshot refreshes for `PAYMENT` / `ALLOCATION` | 398 |
| lib/services/trust.ts | Trust service; `recordManualLedgerEntry()` and `disburseToLandlord()` now also trigger `recordSnapshotEvent('LEDGER')` | 228 |
| lib/services/maintenance.ts | Maintenance service; request creation/status changes/vendor assignment/scheduling/completion/invoice capture now also trigger `recordSnapshotEvent('MAINTENANCE')`, and invoice capture also triggers `recordSnapshotEvent('LEDGER')` | 447 |
| lib/services/inspections.ts | Inspection service; `completeInspection()` and `signInspection()` now also trigger `recordSnapshotEvent('INSPECTION')` after successful mutations | 354 |
| lib/services/offboarding.ts | Offboarding service; `finaliseDepositSettlement()` and `closeOffboardingCase()` now also trigger `recordSnapshotEvent('OFFBOARDING')` | 426 |
| lib/analytics/kpis.ts | `KpiId`, `KpiDefinition`, `KPIS`, `getKpi()` - role-aware KPI registry for M4 drill targets and display metadata; Phase 1 adds `NET_RENTAL_INCOME`, `RENT_BILLED`, `RENT_COLLECTED`, `URGENT_MAINTENANCE` KPI definitions | 308 |
| lib/analytics/ctx.ts | `AnalyticsCtx`, `resolveAnalyticsCtx(searchParams, base)`, `DateRange`, `CompareMode`, `Scope` — URL→typed analytics context with date range + compare + scope filters | 78 |
| lib/analytics/formatters.ts | `formatKpi()` - shared KPI formatter for cents, counts, and percentages | 7 |
| lib/analytics/chart-theme.ts | `chartTheme`, `getSeriesPalette()` - shared Regalis chart token registry and deterministic palette helper | 31 |
| lib/analytics/drill-targets.ts | `resolveDrillTarget()` - central KPI drill-through path builder with optional scope query params | 16 |
| components/analytics/empty-metric.tsx | `EmptyMetric` - compact analytics empty-state panel | 22 |
| components/analytics/status-strip.tsx | `StatusStrip` - strip of compact KPI/status cells for dashboard modules | 42 |
| components/analytics/ranked-list.tsx | `RankedList` - editorial top-N list with optional links | 66 |
| components/analytics/sparkline.tsx | `Sparkline`, `sparklinePathD()` — pure SVG mini area chart used by `KpiTile` | 77 |
| components/analytics/kpi-tile.tsx | `KpiTile` - registry-backed KPI card with trend chip and drill-through link; Phase 1 adds optional `series?: number[]` prop for sparkline rendering | 74 |
| components/analytics/dashboard-shell.tsx | `DashboardShell` — sticky 8-tab nav + range/compare URL-filter bar wrapping all `/dashboard/*` routes | 102 |
| components/analytics/charts/combo-chart.tsx | `ComboChart`, `ComboChartPoint` — Recharts ComposedChart line+bars with optional dashed prior-period overlay | 140 |
| components/analytics/charts/area-chart.tsx | `ChartPoint`, `AreaChart` - shared Recharts area chart wrapper using the analytics theme registry | 66 |
| components/analytics/charts/bar-chart.tsx | `BarChart` - shared Recharts bar chart wrapper using the analytics theme registry | 40 |
| components/analytics/charts/donut-chart.tsx | `DonutChart` - shared Recharts donut chart wrapper using the analytics theme registry | 41 |
| components/analytics/charts/trend-card.tsx | `TrendCard` - KPI tile + sparkline composition block | 30 |
| components/analytics/maps/portfolio-pins.tsx | `PortfolioPin`, `PortfolioPins` - React-Leaflet portfolio marker renderer with custom `divIcon` pins | 53 |
| components/analytics/maps/map-panel.tsx | `MapPanel` - lazily-loaded portfolio map shell with empty-state fallback | 45 |
