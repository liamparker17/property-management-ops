# Codebase Manifest — Property Management Ops

> **This is the LLM source of truth.** Check here BEFORE reading any file.
> Last updated: 2026-04-24 (M2 — Itemised billing, payments, trust, statements)

## Stack

Next.js 16.2 | React 19 | TypeScript strict | Prisma 7 + Neon Postgres | NextAuth v5 (JWT/Credentials) | Tailwind 4 + shadcn | Vercel Blob | Zod 4

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
| GMAIL_USER | Gmail address used as SMTP sender; leave blank to disable outbound email |
| GMAIL_APP_PASSWORD | Gmail App Password (16 chars) — generate at myaccount.google.com/apppasswords with 2FA on |
| EMAIL_FROM_NAME | Display name in From header (default `"PMOps"`) |
| EMAIL_FROM | Optional explicit From override (default `"EMAIL_FROM_NAME <GMAIL_USER>"`) |
| EMAIL_REPLY_TO | Optional reply-to address (route tenant replies to a real inbox) |
| APP_URL | Base URL used in email/SMS login links; falls back to request origin |
| SMS_GATEWAY_USER | Username for SMS Gateway for Android cloud server; leave blank to disable SMS |
| SMS_GATEWAY_PASSWORD | Password for SMS Gateway for Android cloud server |
| SMS_GATEWAY_URL | Optional override endpoint for self-hosted / private SMS server (default is the public cloud URL) |
| OPS_SMS_RECIPIENTS | Comma-separated E.164 numbers that receive PM-side alerts (new maintenance, lease signings, clause reviews) |
| OPS_EMAIL_RECIPIENTS | Comma-separated addresses that receive PM-side email alerts (public contact + signup-request notifications in `lib/email.ts`) |
| INTEGRATION_SECRET_KEY | 32-byte hex key for AES-256-GCM cipher on `OrgIntegration` token fields (read by `lib/crypto.ts`) |
| STITCH_PARTNER_ID | White-label partner id in the Stitch Connect onboarding URL |
| STITCH_WEBHOOK_SECRET | HMAC secret used by Stitch adapters to verify inbound webhook signatures |
| STITCH_REDIRECT_URI | OAuth callback for the Stitch Connect flow (payments + DebiCheck + payouts) |
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

**Do NOT set NEXTAUTH_URL on Vercel** — auto-detected from VERCEL_URL.

## Database Schema (prisma/schema.prisma)

**Enums:** Role (ADMIN, PROPERTY_MANAGER, FINANCE, TENANT, LANDLORD, MANAGING_AGENT) | OrgOwnerType (PM_AGENCY, LANDLORD_DIRECT) | FeatureFlagKey (UTILITIES_BILLING, TRUST_ACCOUNTING, AREA_NOTICES, LANDLORD_APPROVALS, USAGE_ALERTS, PAYMENT_ALERTS, ANNUAL_PACKS) | ApprovalKind (MAINTENANCE_COMMIT, LEASE_CREATE, LEASE_RENEW, RENT_CHANGE, TENANT_EVICT, PROPERTY_REMOVE) | ApprovalState (PENDING, APPROVED, DECLINED, CANCELLED) | LeaseState (DRAFT, ACTIVE, TERMINATED, RENEWED) | DocumentKind (LEASE_AGREEMENT) | SAProvince (GP, WC, KZN, EC, FS, LP, MP, NW, NC) | MaintenancePriority (LOW, MEDIUM, HIGH, URGENT) | MaintenanceStatus (OPEN, IN_PROGRESS, RESOLVED, CLOSED) | InvoiceStatus (DRAFT, DUE, PAID, OVERDUE) | ReviewRequestStatus (OPEN, ACCEPTED, REJECTED, RESOLVED) | ApplicationStage (DRAFT, SUBMITTED, UNDER_REVIEW, VETTING, APPROVED, DECLINED, CONVERTED, WITHDRAWN) | ApplicationDecision (PENDING, APPROVED, DECLINED) | TpnCheckStatus (NOT_STARTED, REQUESTED, RECEIVED, FAILED, WAIVED) | TpnRecommendation (PASS, CAUTION, DECLINE, UNKNOWN) | IntegrationProvider (STITCH_PAYMENTS, STITCH_DEBICHECK, STITCH_PAYOUTS, QUICKBOOKS, TPN) | IntegrationStatus (DISCONNECTED, CONNECTED, ERROR) | InvoiceLineItemKind (RENT, UTILITY_WATER, UTILITY_ELECTRICITY, UTILITY_GAS, UTILITY_SEWER, UTILITY_REFUSE, ADJUSTMENT, LATE_FEE, DEPOSIT_CHARGE) | UtilityType (WATER, ELECTRICITY, GAS, SEWER, REFUSE, OTHER) | MeterReadingSource (MANUAL, IMPORT, ESTIMATED, ROLLOVER) | TariffStructure (FLAT, TIERED) | PaymentMethod (EFT, CASH, CHEQUE, CARD_MANUAL, OTHER) | ReceiptSource (MANUAL, CSV_IMPORT, STITCH, DEBICHECK) | AllocationTarget (INVOICE_LINE_ITEM, DEPOSIT, LATE_FEE, UNAPPLIED) | LedgerEntryType (RECEIPT, DISBURSEMENT, ALLOCATION, REVERSAL, DEPOSIT_IN, DEPOSIT_OUT, FEE) | StatementType (TENANT, LANDLORD, TRUST) | DebiCheckMandateStatus (PENDING_SIGNATURE, ACTIVE, REVOKED, FAILED)

**Models:**
| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Org | name, slug, ownerType, landlordApprovalThresholdCents, expiringWindowDays | users, properties, units, tenants, leases, documents, landlords, managingAgents, approvals, orgFeatures, auditLogs |
| OrgFeature | orgId, key, enabled, config, updatedAt | org — unique(orgId, key) |
| AuditLog | orgId, actorUserId?, entityType, entityId, action, diff?, payload?, createdAt | org, actor? |
| User | email, passwordHash, role, orgId, landlordId?, managingAgentId?, disabledAt | org, landlord?, managingAgent?, accounts, sessions, documents, auditLogs |
| Landlord | orgId, name, email?, phone?, vatNumber?, archivedAt | org, users, properties, approvals |
| ManagingAgent | orgId, name, email?, phone?, archivedAt | org, users, assignedProperties |
| Property | name, address*, suburb, city, province, postalCode, landlordId?, assignedAgentId?, deletedAt | org, landlord?, assignedAgent?, units, documents |
| Unit | propertyId, label, bedrooms, bathrooms, sizeSqm | property, leases, documents |
| Tenant | firstName, lastName, email, phone, idNumber, userId, archivedAt | org, leases, documents |
| Lease | unitId, startDate, endDate, rentAmountCents, depositAmountCents, depositReceivedAt?, selfManagedDebitOrderActive, state, renewedFromId | unit, tenants (M2M via LeaseTenant), documents, invoices, receipts, depositAllocations, trustLedgerEntries, debiCheckMandate? |
| LeaseTenant | leaseId, tenantId, isPrimary | lease, tenant |
| Document | kind, storageKey, filename, mimeType, sizeBytes, uploadedById | lease?, property?, unit?, tenant? |
| Account/Session/VerificationToken | Standard NextAuth models | |
| MaintenanceRequest | title, description, priority, status, internalNotes, resolvedAt | org, tenant, unit |
| Invoice | leaseId, periodStart, dueDate, amountCents (legacy cache), subtotalCents, taxCents, totalCents, status (DRAFT/DUE/PAID/OVERDUE), paidAt, paidAmountCents, paidNote, billingRunId? | org, lease, billingRun?, lineItems — unique(leaseId, periodStart) |
| LeaseSignature | leaseId, tenantId, signedName, signedAt, ipAddress, userAgent, latitude, longitude, locationText | lease, tenant — unique(leaseId, tenantId) |
| LeaseReviewRequest | leaseId, tenantId, clauseExcerpt, tenantNote, status, pmResponse, respondedAt | lease (no FK to tenant) |
| Approval | orgId, landlordId, propertyId?, kind, subjectType?, subjectId?, payload (Json), state, reason?, decisionNote?, requestedById, decidedById?, decidedAt? | org, landlord |
| Applicant | orgId, firstName, lastName, email, phone, idNumber?, employer?, grossMonthlyIncomeCents?, netMonthlyIncomeCents?, tpnConsentGiven, tpnConsentAt?, tpnConsentCapturedById? | org, applications |
| Application | orgId, applicantId, propertyId?, unitId?, stage, decision, decisionReason?, decidedAt?, assignedReviewerId?, requestedMoveIn?, sourceChannel?, affordabilityRatio?, convertedTenantId?, convertedLeaseId? | org, applicant, property?, unit?, reviewer?, tpnCheck?, documents, notes, convertedTenant? |
| ApplicationDocument | applicationId, filename, mimeType, sizeBytes, storageKey, description?, uploadedById | application |
| ApplicationNote | applicationId, authorId, body | application, author |
| TpnCheck | applicationId (unique), status, requestedAt?, receivedAt?, tpnReferenceId?, recommendation?, summary?, reportPayload? (Json), reportBlobKey?, waivedReason?, waivedById? | application |
| Notification | orgId, userId?, role?, type, subject, body, payload? (Json), entityType?, entityId?, readAt?, createdAt | org, user? |
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
| ReconciliationException | runId, kind (UNMATCHED_BANK_TX/UNALLOCATED_RECEIPT/OVER_ALLOCATED/MISSING_LEDGER_ENTRY/BALANCE_MISMATCH), entityType, entityId, detail (Json), resolvedAt?, resolvedById? | run |
| Statement | orgId, type (StatementType), subjectType, subjectId, periodStart, periodEnd, openingBalanceCents, closingBalanceCents, totalsJson, storageKey?, generatedAt | org, lines |
| StatementLine | statementId, occurredAt, description, debitCents, creditCents, runningBalanceCents, sourceType?, sourceId? | statement |
| DebiCheckMandate | orgId, leaseId (unique), tenantId, mandateExternalId?, upperCapCents, status (DebiCheckMandateStatus), signedAt? | lease |

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
| prisma.config.ts | defineConfig with schema path | 12 |
| tsconfig.json | strict, ES2017, @/* alias | 35 |
| components.json | shadcn UI config | — |
| vercel.json | Vercel cron registrations: `/api/cron/debicheck-retry` (daily 00:00 UTC) + `/api/cron/reconciliation` twice daily (04:00 + 16:00 UTC ≙ 06:00 + 18:00 SAST) | 7 |

### lib/
| File | Exports | Lines |
|------|---------|-------|
| db.ts | `db` — PrismaClient singleton with pg adapter | 14 |
| auth.config.ts | `authConfig` — edge-safe NextAuthConfig (JWT strategy, callbacks: jwt+session add userId/role/orgId) | 32 |
| auth.ts | `handlers, auth, signIn, signOut` — full NextAuth with Credentials provider, bcrypt, loginSchema | 36 |
| auth/with-org.ts | `withOrg<P>()` — HOF for auth'd API routes; `RouteCtx {orgId, userId, role}`, `RouteParams<P>` | 38 |
| errors.ts | `ApiError` class (unauthorized/forbidden/notFound/validation/conflict/internal), `toErrorResponse()`, `ApiErrorCode` type | 58 |
| format.ts | `formatZar(cents)`, `formatDate(d)` | 12 |
| lease-template.ts | `LeaseTemplateData`, `LeaseSection`, `renderLeaseAgreement(data)` — generic SA residential lease generator (15 sections) | 200 |
| email.ts | `sendTenantInvite({to, tenantName, orgName, tempPassword, appUrl})`, `SendResult` — Gmail SMTP (nodemailer) transactional email; no-ops gracefully if `GMAIL_USER`/`GMAIL_APP_PASSWORD` missing | 112 |
| sms.ts | `sendTenantInviteSms`, `sendMaintenanceCreatedOpsSms`, `sendMaintenanceCreatedTenantSms`, `sendMaintenanceStatusTenantSms`, `sendLeaseSignedOpsSms`, `sendReviewRequestOpsSms`, `sendReviewResponseTenantSms`, `sendInvoicePaidTenantSms`, `SendResult` — SMS via SMS Gateway for Android (cloud mode); normalizes ZA local numbers to E.164; ops messages go to `OPS_SMS_RECIPIENTS`; no-ops if unconfigured | — |
| blob.ts | `validateFile(file)` (20MB, pdf/png/jpeg/webp), `uploadBlob(path, file)`, `deleteBlob(pathname)` | 13 |
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
| integrations/bank-csv/dialects.ts | `BankCsvDialect`, `getDialect(name)` — header maps for `generic` CSV dialect in M2; bank-specific dialects deferred to M4 | 45 |
| reports/statement-pdf.ts | `renderStatementPdf(statement)` — deterministic PDF buffer with TENANT/LANDLORD/TRUST layouts routed by `StatementType` | 98 |
| reports/debit-order-instruction-pdf.ts | `renderDebitOrderInstruction({ org, lease, bankDetails })` — one-page PDF with bank details + reference (`${BANK_REF_PREFIX}${lease.id}`) + suggested cap (`rent + 25%`) | 99 |

### lib/services/
| File | Exports | Lines |
|------|---------|-------|
| dashboard.ts | `getDashboardSummary(ctx)` → portfolio totals, occupancy, lease expiries, invoice overview (invoiced vs paid, overdue accounts, cashflow by unit, expiry buckets), recent leases; M2 adds `incomeByKind` (RENT vs UTILITY_* split sourced from `InvoiceLineItem`) | 301 |
| leases.ts | `DerivedStatus` type, `deriveStatus()`, `listLeases()`, `getLease()`, `createLease()`, `updateDraftLease()`, `activateLease()` (M2: writes `DEPOSIT_IN` ledger entry when `depositReceivedAt` set), `terminateLease()`, `renewLease()`, `setPrimaryTenant()`, `setSelfManagedDebitOrder()` | — |
| properties.ts | `listProperties()`, `getProperty()`, `createProperty()`, `updateProperty()`, `softDeleteProperty()` | 51 |
| tenants.ts | `listTenants()`, `getTenant()`, `detectDuplicates()`, `createTenant()`, `updateTenant()`, `archiveTenant()`, `unarchiveTenant()`, `deleteTenant()` (hard delete — requires archived; cascades LeaseTenant, MaintenanceRequest, LeaseSignature, LeaseReviewRequest, linked User; nulls Document.tenantId), `inviteTenantToPortal()` — creates a TENANT User, links via Tenant.userId, returns one-time temp password | 170 |
| units.ts | `UnitOccupancy` type, `getUnitOccupancy()`, `listUnits()`, `getUnit()`, `createUnit()`, `updateUnit()`, `deleteUnit()` | 97 |
| documents.ts | `uploadLeaseAgreement()`, `getDocumentForDownload()` | 37 |
| team.ts | `listTeam()`, `createTeamUser()`, `updateTeamUser()`, `getOrg()`, `updateOrg()`, `changeOwnPassword()` | 102 |
| tenant-portal.ts | `getTenantProfile()`, `getActiveLeaseForTenant()`, `getPendingLeaseForTenant()` (DRAFT lease w/ signatures+reviewRequests filtered to tenant), `getTenantLeases()`, `listTenantDocuments()`, `getTenantDocumentForDownload()` — all scoped by User.id → Tenant.userId | 106 |
| signatures.ts | `signLeaseAsTenant()`, `getTenantSignatureForLease()`, `listLeaseSignatures(ctx)`, `createReviewRequest()`, `listTenantReviewRequests()`, `listLeaseReviewRequests(ctx)`, `respondToReviewRequest(ctx)` | 145 |
| onboarding.ts | `onboardTenant(ctx, input)` — single-transaction tenant + DRAFT lease + optional portal account with temp password | 94 |
| maintenance.ts | `createTenantMaintenanceRequest()`, `listTenantMaintenanceRequests()`, `getTenantMaintenanceRequest()`, `listMaintenanceRequests()`, `getMaintenanceRequest()`, `updateMaintenanceRequest()` | 128 |
| invoices.ts | `ensureInvoicesForLease()` (idempotent month-by-month generator, past→PAID, current/future→DUE), `listTenantInvoices()`, `getInvoiceForTenant()`, `listLeaseInvoices()`, `markInvoicePaid()` (M2: creates MANUAL `PaymentReceipt`, allocates against line items, writes ledger via `lib/services/trust.ts`), `markInvoiceUnpaid()` (M2: reverses auto-generated allocations + deletes the receipt) | — |
| audit.ts | `writeAudit(ctx, input)` — reusable audit-log writer with JSON-safe payload normalization; swallows insert failures after logging | 90 |
| landlords.ts | `listLandlords()`, `getLandlord()`, `createLandlord()`, `updateLandlord()` | — |
| managing-agents.ts | `listManagingAgents()`, `getManagingAgent()`, `createManagingAgent()`, `updateManagingAgent()` | — |
| landlord-portal.ts | `getLandlordProfile()`, `listLandlordProperties()`, `getLandlordPortfolioSummary()` — scoped by User.id → User.landlordId | — |
| approvals.ts | `requestApproval()`, `listPendingForLandlord()`, `listApprovalsForOrg()`, `decideApproval()`, `cancelApproval()` — generic approval workflow (MAINTENANCE_COMMIT etc.) | — |
| org-features.ts | `getOrgFeatures()`, `setOrgFeature()`, `assertFeature()` — workspace feature flag lookups/upserts with audit logging on toggles | 97 |
| applications.ts | `listApplications`, `getApplication`, `createApplication`, `updateApplication`, `submitApplication`, `assignReviewer`, `addApplicationNote`, `uploadApplicationDocument`, `withdrawApplication` — applicant+application CRUD with stage transitions; writes AuditLog + notification hooks on submit | 330 |
| tpn.ts | `captureTpnConsent`, `requestTpnCheck`, `recordTpnResult`, `waiveTpnCheck`, `getTpnCheck` — TPN integration lifecycle; persists TpnCheck rows + reportPayload; audited. M2: calls `tpnAdapter.submitCheck(ctx, payload)` so credentials route through `OrgIntegration(TPN)` | — |
| vetting.ts | `approveApplication`, `declineApplication`, `convertApplicationToTenant` — decision + conversion service; enforces TPN/consent gates; delegates to `onboardTenant`; notifies assigned reviewer | 256 |
| notifications.ts | `createNotification(ctx, input)` — M1-minimal in-app Notification row writer (no email/SMS delivery yet) | 27 |
| org-integrations.ts | `listOrgIntegrations`, `getOrgIntegration`, `connectOrgIntegration` (encrypts tokens, audits), `disconnectOrgIntegration`, `markIntegrationError`, `readDecryptedTokens` (server-only; throws unless CONNECTED), `DecryptedTokens`, `ConnectInput` types | 187 |
| utilities.ts | `listMeters`, `getMeter`, `createMeter`, `retireMeter`, `recordMeterReading` (enforces `@@unique([meterId, takenAt])`), `latestReading`, `estimateMissingReading` (rolling 3-month avg, falls back to ROLLOVER), `listTariffs`, `upsertTariff` (org-wide default + optional property override); every mutation audits | 273 |
| billing.ts | `InvoiceLineItemDraft`, `calculateUtilityChargesForLease`, `generateBillingRun` (idempotent per `(orgId, periodStart)`; rent + utility lines), `rebuildInvoiceTotals`, `previewBillingRun`, `publishBillingRun` (DRAFT→DUE, estimate-gate honoured), `addManualLineItem`, `removeLineItem`, `listBillingRuns`, `getBillingRun` | 543 |
| payments.ts | `listReceipts`, `getReceipt`, `recordIncomingPayment`, `importReceiptsCsv` (dialect-aware via `lib/integrations/bank-csv/dialects.ts`; dupe-key `(orgId, externalRef)`; matches `${BANK_REF_PREFIX}${leaseId}` references), `allocateReceipt` (auto-allocate oldest-first when caller omits allocations), `reverseAllocation` (30-day gate for non-ADMIN, indefinite for ADMIN, audited); every mutation emits matching ledger entries via `trust.ts` | 424 |
| trust.ts | `ensureTrustAccount(ctx, landlordId)`, `writeLedgerEntry`, `getTrustBalance(ctx, landlordId)`, `getPortfolioTrustBalance` (per-landlord rollup), `getTenantTrustPosition`, `recordManualLedgerEntry`, `disburseToLandlord` (calls `stitchPayoutsAdapter.initiatePayout`, persists external id on `TrustLedgerEntry.sourceId`); enforces `entry.landlordId === account.landlordId` on every insert | 242 |
| statements.ts | `generateTenantStatement`, `generateLandlordStatement`, `generateTrustStatement` (per-landlord, replaces org-wide plan default), `regenerateStatement` (re-renders PDF, keeps `StatementLine` rows frozen), `listStatements`; each generation uploads PDF via `lib/blob.ts` and persists `storageKey` | 426 |
| reconciliations.ts | `ReconciliationPreview`, `previewRecon`, `runTrustReconciliation` (matches bank txns to `PaymentReceipt` by `(amountCents, externalRef)` within ±3 business days; unmatched → `ReconciliationException { kind: UNMATCHED_BANK_TX }`; deterministic rerun per `(orgId, periodStart, periodEnd)`), `listReconciliationRuns`, `resolveException` | 252 |
| stitch-payments.ts | `InitiateInboundPaymentInput`, `initiateInboundPayment` (returns hosted-checkout redirect URL), `StitchWebhookResult`, `handleStitchWebhook` (signature-verified; creates `PaymentReceipt { source: STITCH }` + auto-allocates), `isStitchPaymentsConnectedAnywhere` | 148 |
| debicheck.ts | `createMandateRequest`, `submitMonthlyCollection` (cap-aware; refuses when `amountCents > upperCapCents`), `retryUnpaidCollection` (day +2; flips invoice to OVERDUE + notifies when still unpaid), `isDebicheckConnectedAnywhere`, `applyMandateWebhookStatus` | 175 |

### lib/zod/
| File | Exports | Lines |
|------|---------|-------|
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
| maintenance.ts | `maintenancePriorityEnum`, `maintenanceStatusEnum`, `createMaintenanceRequestSchema`, `updateMaintenanceRequestSchema` | 18 |
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

### scripts/
| File | Purpose | Lines |
|------|---------|-------|
| scripts/report-missing-pages.ts | CLI planner report for missing nav destinations based on `validateNav()`; prints missing routes without failing the build | 19 |
| scripts/backfill-property-owners.ts | Dry-run-first backfill for missing `Property.landlordId` / `assignedAgentId`; unresolved rows are emitted as CSV on stdout and `--write` persists safe assignments | 246 |
| scripts/backfill-invoice-line-items.ts | Idempotent one-time backfill that writes a single `RENT` `InvoiceLineItem` per legacy `Invoice` without line items, mirrors totals into `subtotalCents`/`totalCents`. Dry-run default; `--write` persists. Wired as `backfill:invoice-lines` in `package.json` | 67 |

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

### app/ — Layouts & Pages
| Route | File | Purpose |
|-------|------|---------|
| — | app/layout.tsx | Root layout: metadata + `<Providers>` wrapper | 
| — | app/providers.tsx | Client: `<SessionProvider>` |
| / | (marketing)/page.tsx | Landing page |
| — | (marketing)/layout.tsx | Public layout shell |
| /login | (marketing)/login/page.tsx | Renders `<LoginForm>` in Suspense |
| — | (staff)/layout.tsx | Auth guard + `<StaffNav>` |
| /dashboard | (staff)/dashboard/page.tsx | Staff dashboard with portfolio KPIs, drill-through cards, invoiced vs paid chart, receivables donut, overdue accounts, cashflow by unit, expiring leases |
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
| /maintenance/[id] | (staff)/maintenance/[id]/page.tsx | Staff detail + update status/priority/internal notes |
| /maintenance/[id] | (staff)/maintenance/[id]/update-form.tsx | Client: status/priority/notes form |
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
| /tenant/invoices/[id] | (tenant)/tenant/invoices/[id]/page.tsx | Itemised invoice with rent/utilities groupings, totals, pay-rail cards |
| /tenant/invoices/[id] | (tenant)/tenant/invoices/[id]/pay-button.tsx | Client: POSTs `/api/payments/stitch/checkout`, redirects to Stitch hosted checkout |
| /tenant/payments | (tenant)/tenant/payments/page.tsx | Rails overview: active payment methods + "Set up new method" actions |
| /tenant/payments | (tenant)/tenant/payments/debicheck-card.tsx | Client: "Sign DebiCheck mandate in your banking app" + status pill |
| /tenant/payments | (tenant)/tenant/payments/self-managed-card.tsx | Client: download instruction PDF; shows "Debit order active (self-managed)" pill |

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
| /api/cron/reconciliation | GET | Vercel cron — runs `runTrustReconciliation` for every QBO-connected org at 06:00 + 18:00 SAST; noop when `QBO_CLIENT_ID` unset |
| /api/cron/debicheck-retry | GET | Vercel cron — walks failed-but-retryable DebiCheck collections and runs `retryUnpaidCollection` (02:00 SAST) |
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
| signup-form.tsx | Client | `SignupForm` — marketing `/signup` request form, POSTs to `/api/public/signup-request` | 249 |
| forms/meter-form.tsx | Client | `MeterForm` — property/unit/type/serial create form | 100 |
| forms/meter-reading-form.tsx | Client | `MeterReadingForm` — takenAt + readingValue + source | 85 |
| forms/utility-tariff-form.tsx | Client | `UtilityTariffForm` — upsert tariff (flat or tiered), org default or property override | 113 |
| forms/allocation-dialog.tsx | Client | `AllocationDialog` — allocate receipt to invoice line items, oldest-first default with manual override | 148 |
| forms/reverse-allocation-dialog.tsx | Client | `ReverseAllocationDialog` — captures reason; enforces 30-day gate for non-ADMIN | 97 |
| forms/payment-csv-import-form.tsx | Client | `PaymentCsvImportForm` — dialect picker + multipart upload + preview table | 189 |
 
**Manifest refresh (2026-04-22) — supersedes older line counts above where duplicated**

| File | Type | Exports | Lines |
|------|------|---------|-------|
| empty-state.tsx | Client | `EmptyState` â€” shared empty-state panel with optional icon + action | 43 |
| page-header.tsx | Client | `PageHeader` â€” shared eyebrow/title/description/action header shell | 46 |
| stat-card.tsx | Client | `StatTone`, `StatCard` â€” editorial metric card with left accent rail | 64 |
| lease-status-badge.tsx | Server | `LeaseStatusBadge` â€” lease state pill with editorial status colours | 39 |
| occupancy-badge.tsx | Server | `OccupancyBadge` â€” occupancy pill (VACANT/OCCUPIED/UPCOMING/CONFLICT) | 33 |
| maintenance-badges.tsx | Server | `MaintenanceStatusBadge`, `MaintenancePriorityBadge` â€” maintenance status/priority pills | 36 |
| nav/breadcrumbs.tsx | Client | `Breadcrumbs` â€” pathname-based breadcrumb trail for internal layouts | 70 |
| nav/mobile-nav.tsx | Client | `MobileNav` â€” mobile drawer nav wrapper around `SidebarBody` | 97 |
| nav/sidebar.tsx | Client | `getStaffNavItems()`, `Sidebar`, `SidebarBody`, `DesktopSidebar` â€” shared editorial sidebar shell for portal nav, incl. admin Features link | 155 |
| nav/tenant-sidebar.tsx | Client | `getTenantNavItems()`, `TenantSidebar`, `DesktopTenantSidebar` â€” tenant portal nav config + wrappers | 34 |
| nav/agent-sidebar.tsx | Client | `getAgentNavItems()`, `AgentSidebar`, `DesktopAgentSidebar` â€” agent portal nav config + wrappers (dashboard-only until more routes land) | 29 |
| nav/landlord-sidebar.tsx | Client | `getLandlordNavItems()`, `LandlordSidebar`, `DesktopLandlordSidebar` â€” landlord portal nav config + wrappers (dashboard-only until more routes land) | 29 |
| nav/top-bar.tsx | Server | `TopBar` â€” internal top bar with breadcrumbs, theme toggle, account, sign out | 53 |
