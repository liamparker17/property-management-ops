# Handover — Property Management Ops

**Date written:** 2026-04-15
**For:** A fresh Claude session picking up this project mid-flow
**Written by:** Previous Claude session at end of Slice 2 brainstorming Q1

---

## 1. What this project is

A residential property management web app for a **South African** property manager (ZAR currency, SA Rental Housing Act context). POC structured as **4 sequential slices**, each shippable on its own:

| Slice | Scope | Status |
|---|---|---|
| 1 | Portfolio + Leases | ✅ Spec + plan committed; not yet implemented |
| 2 | Billing + QuickBooks reconciliation | 🟡 Brainstorming in progress (you are here) |
| 3 | Tenant portal (self-service) | ⏳ Not started |
| 4 | Maintenance + Dashboard + Reminders + Test infrastructure | ⏳ Not started |

**Repo location:** `C:\Users\liamp\Desktop\Property Management Ops`
**Git:** initialized, local only, branch `master`
**User email for commits:** `michael.parker.work@gmail.com`, name `Liam Parker`

## 2. What's committed so far

```
e797822 docs: address Slice 1 plan review — DRAFT-invisible occupancy + activation invariant
bba2380 docs: Slice 1 implementation plan (35 tasks)
74989e0 docs(spec): tighten Slice 1 business rules per review
add4c34 docs: define Property.deletedAt for soft-delete semantics
71c0247 docs: Slice 1 design — Portfolio + Leases
```

**Files in the repo:**

- `docs/superpowers/specs/2026-04-15-portfolio-leases-design.md` — Slice 1 spec (authoritative for all Slice 1 business rules)
- `docs/superpowers/plans/2026-04-15-portfolio-leases.md` — Slice 1 implementation plan (35 tasks, ~5,500 lines)
- `docs/superpowers/HANDOVER.md` — this file

Nothing else. No code yet. No `package.json`. Slice 1 has not been implemented.

## 3. Slice 1 quick-reference (you must know this cold before brainstorming Slice 2)

**Stack locked:** Next.js 16 · Prisma 7 + `@prisma/adapter-pg` · Neon Postgres · NextAuth v5 · Vercel Blob · Tailwind · shadcn/ui. Independent repo; flipmodel (`liamparker17/flipmodel`) is a **donor** we copy patterns and code from, but this is not a fork.

**Roles:** `ADMIN`, `PROPERTY_MANAGER`, `FINANCE`, `TENANT`. Tenant route group exists as an empty shell in Slice 1, populated in Slice 3.

**Domain entities (Slice 1):** `Org`, `User`, `Property`, `Unit`, `Tenant`, `Lease`, `LeaseTenant`, `Document`. Every row carries `orgId` (implicit multi-org — no switcher UI, `getOrgId(session)` helper).

**Critical Slice 1 invariants (do not break in Slice 2):**

- **Money stored as integer cents.** `Lease.rentAmountCents`, `Lease.depositAmountCents`.
- `Lease.paymentDueDay` (1–31), `Lease.heldInTrustAccount` bool — all present but explicitly **stored-not-wired** in Slice 1. Slice 2 wires them.
- **Lease state machine:** persisted `state ∈ {DRAFT, ACTIVE, TERMINATED, RENEWED}`; derived `status ∈ {DRAFT, ACTIVE, EXPIRING, EXPIRED, TERMINATED, RENEWED}` computed by `deriveStatus(lease, expiringWindowDays)` in `lib/services/leases.ts`.
- **A lease whose `endDate` passed but was never terminated stays `state=ACTIVE`, shows `status=EXPIRED`.** No nightly job flips it.
- **DRAFT leases are invisible to occupancy.** Drafts are proposals, not commitments. `getUnitOccupancy` only queries `state: 'ACTIVE'`.
- **Activation is the real gate.** `activateLease` asserts ≥1 tenant, exactly one primary, and no overlap with another ACTIVE lease on the same unit. `createLease` does NOT run an overlap check — drafts are free.
- **Joint leases:** all tenants jointly liable; `isPrimary` is a communications/display convention only, not a liability marker. Partial unique index on `LeaseTenant` enforces exactly one primary.
- **Documents:** single canonical owner (exactly one of `leaseId`/`propertyId`/`unitId`/`tenantId` set, enforced by a `CHECK` constraint). Related views surface via relationship traversal, not polymorphic ownership.
- **Tenant identity:** email is **nullable and not unique**. Duplicate detection is soft (warn, don't block). Tenants can be archived (not hard-deleted) when they have no active or upcoming leases.
- **No email invites.** Admins create staff accounts directly with a temporary password. Post-POC for MFA / password reset / invitations.
- **Testing deferred to Slice 4.** Slice 1 and Slice 2 plans use manual verification (typecheck + lint + dev-server smoke). Do **not** "correct" this by adding Vitest/Playwright tasks — it is a user-approved exception. Slice 4 is responsible for backfilling unit + API + Playwright coverage.

**Error contract:** `{ error: { code, message, details? } }` with `UNAUTHORIZED | FORBIDDEN | NOT_FOUND | VALIDATION_ERROR | CONFLICT | INTERNAL`. Cross-org access returns `404`, not `403`, to avoid existence leaks.

**API wrapper:** every handler uses `withOrg(handler, { requireRole? })` which injects `RouteCtx = { orgId, userId, role }` from the session. Services are pure functions of `(ctx, input)`.

## 4. Slice 2 brainstorm — where we are

The `superpowers:brainstorming` skill was invoked. Tasks 7–12 on the local TaskList are the Slice 2 checklist. Task 7 (explore context) is done; Task 8 (clarifying questions) is in progress.

### 4.1 The pivot you must be aware of

**Original direction:** Stripe-as-primary payment rail. I asked Q1 about Stripe posture (Checkout vs Payment Element vs subscriptions).

**User redirected:** "So here's the thing, I was thinking we need a quickbooks integration that will allow us to match expected payments with payments received, this is something that i believe can be partly stripped from flipmodel".

**New direction:** Slice 2 is a **QuickBooks integration** focused on **reconciliation**, not Stripe card collection. Stripe is out of Slice 2 entirely (it may return in a later slice as an optional "pay online" channel, but do not presume that). Business logic is:

1. Our app owns the **rent charge schedule** — generated from `Lease.rentAmountCents` + `paymentDueDay` monthly going forward.
2. Push charges to **QuickBooks** as invoices against a QB customer per tenant.
3. Pull bank-feed transactions from QB.
4. **Reconcile** QB transactions against our charges to compute `paid / partial / outstanding / overdue`.
5. Dashboard + PM views surface arrears, paid, overdue from the combined view.
6. South African PMs mostly receive rent via **EFT**, not card — the reconciliation is the entire point. Matching is what the PM actually needs.

This is a bigger slice than Stripe would have been, and is worth decomposing carefully (see §4.3).

### 4.2 Flipmodel QuickBooks donor parts

Confirmed present in `liamparker17/flipmodel@main` via `gh api .../git/trees?recursive=1`:

```
app/lib/accounting/providers.ts         ← provider abstraction (QB + Xero; we drop Xero)
app/lib/accounting/quickbooks.ts        ← QB API client
app/lib/accounting/token-manager.ts     ← OAuth token refresh
app/lib/accounting/credentials.ts       ← encrypted credential storage
app/api/accounting/quickbooks/connect/route.ts
app/api/accounting/quickbooks/callback/route.ts
app/api/accounting/chart-of-accounts/route.ts
app/api/accounting/sync/route.ts
app/api/bank-accounts/[accountId]/transactions/[transactionId]/reconcile/route.ts
app/api/invoices/route.ts
app/api/invoices/[invoiceId]/route.ts
app/api/invoices/__tests__/invoices-routes.test.ts
app/api/receivables/[receivableId]/pay/[paymentId]/route.ts
app/types/accounting.ts
app/lib/validations/invoice.ts
```

**Drop from flipmodel:**
- Xero provider (we only need QB for POC)
- `app/api/payables` (we don't pay vendors in Slice 2 — it's rent-receivables-only)
- Any Slice 2+ accounting features (multi-currency, complex adjustments, credit notes) unless explicitly needed

**Keep** the provider abstraction even though we only wire QB — it's cheap and future-proofs Xero/Sage later without rewriting.

### 4.3 Recommended decomposition (not yet approved by the user)

This is MY recommendation, not locked. Before presenting it, the next Claude must first get the user to confirm the QB-as-source-of-payments direction (Q1 below).

**Slice 2 as one cohesive unit:**

1. **Rent charge schedule** — new `RentCharge` model (lease → monthly rows for `N` months forward). Generator runs on lease activation + on a background job (or on-read, TBD). Keys: `leaseId`, `orgId`, `periodStart`, `periodEnd`, `dueDate`, `amountCents`, `state: SCHEDULED|INVOICED|PAID|PARTIAL|OVERDUE|VOID`, `qbInvoiceId?`.
2. **Deposit charge** — separate one-off `RentCharge` (or a sibling `DepositCharge`) created at lease activation when `depositAmountCents > 0`. `heldInTrustAccount` determines which QB sub-account / class it lands in.
3. **QuickBooks connection** — OAuth connect/callback copied from flipmodel. Per-org QB credentials encrypted at rest.
4. **Chart-of-accounts mapping** — admin UI to map "Rent income" / "Deposits held in trust" to QB accounts. Minimum viable: two fields on `Org`.
5. **QB customer sync** — for each `Tenant`, lazily create or reuse a QB customer keyed on our `tenantId` (stored in a `qbCustomerId` column).
6. **Push invoice to QB** — on charge `SCHEDULED → INVOICED`, create a QB invoice, store `qbInvoiceId`.
7. **Pull bank feed** — scheduled sync pulls recent QB bank transactions for the configured bank account.
8. **Reconciliation matcher** — service that takes a QB bank transaction and proposes matches to open charges (exact amount + nearest due date + tenant reference heuristics). Staff confirms; system records a `Payment` row linked to the charge and updates charge state.
9. **Dashboard additions** — arrears total, this-month-expected, this-month-received, overdue-count.
10. **Out of scope for Slice 2:** automatic matching (always staff-confirmed), refunds, credit notes, multi-currency, Stripe, tenant-initiated payments, late-fee rules.

**Possible further split** (ask the user): Slice 2 could break into **2a — local charges + manual payment recording, no QB** and **2b — QB integration**. But 2a on its own doesn't prove reconciliation, so I'd lean against splitting unless the user wants to ship 2a first for demo reasons.

### 4.4 The exact question that was open when I ran out of turn

**Q1 — Who is the source of truth for expected rent charges and for payments received?**

- **A) We own charges; QB owns payments. We reconcile.** *(Recommended, matches user framing.)* Our app generates the monthly rent schedule, pushes to QB as invoices, pulls QB bank transactions, matches.
- **B) QB owns everything; we mirror.** No local charges. Push recurring-invoice template to QB, query QB back for expected and received. Lean on paper but couples every dashboard query to a QB API call and breaks offline.
- **C) We own everything; QB is a read-only export.** Run the full local ledger, export summaries to QB for the PM's accountant. Duplicates work the PM already does in QB.

**I was about to ask the user to confirm A before continuing.** The user then asked for this handover doc. **The next Claude must ask Q1 first thing.**

## 5. User preferences and communication style

- **Terse.** Short messages, pushes back when something is off. Doesn't want verbose reasoning — wants decisions and tradeoffs presented clearly with a recommendation.
- **Wants decomposition done up front.** Big slices get broken down before details are debated.
- **Wants Slice 1 fidelity.** Slice 2 must not accidentally renegotiate Slice 1 invariants — if a conflict surfaces, flag it rather than silently redesigning.
- **Flipmodel is a donor, not a parent.** "We can copy code directly, but this is not flipmodel". Cannibalize freely; don't fork, don't create cross-repo dependencies.
- **Reviews aggressively.** Expect a pointed review after each design section with specific spec-level fixes. Act on all points, even small ones.
- **Wants the money layer to be real.** "This is something that I believe can be partly stripped from flipmodel" — meaning the user knows the flipmodel code and wants to reuse it, not start from zero.
- **POC pragmatism.** Testing is deferred to Slice 4. Manual acceptance walkthroughs replace automated tests until then. Do not re-add TDD for Slice 2.

### Known feedback patterns (from global memory, summarized)

- **Never** click Update/Publish on live WordPress posts without permission (not relevant here but shows user's caution about destructive actions).
- **Always** use scripts/dispatch for repetitive work — don't hand-roll loops.
- **Epistemic discipline**: observation features should report facts, not infer invariants. If something is derived, say so; never present a derivation as a guarantee.
- **Human-in-the-loop UX** must answer: whose turn, what to do, did it work, what's next. Any staff-confirmed reconciliation UI must follow this.
- **Tool descriptions** need SEO-style keywords so MCP semantic search finds them — not relevant here but reflects the user's attention to findability.

## 6. How to continue in the next session

1. **Do not re-invoke task-router.** Already done — this work is classified as Feature + Planning + multi-domain, routed to `superpowers:brainstorming` → `superpowers:writing-plans`.
2. **Invoke `superpowers:brainstorming`** at the start of the next message to re-establish the skill's checklist, then acknowledge you've read this handover.
3. **Ask Q1** (§4.4) immediately. Do not ask any other question first. Do not present a design first.
4. **After user answers Q1**, proceed to further clarifying questions in this order:
   - Q2: Multi-tenant QB or single-connection-per-org? (Expected: single per org.)
   - Q3: Does Slice 2 generate a full 12-month schedule on lease activation, or roll forward N months via a scheduled job?
   - Q4: Partial payments allowed on a charge? (Likely yes — SA tenants sometimes split rent.)
   - Q5: Deposit flow — single charge at activation, pushed to QB with a different account mapping, or kept entirely off-QB until Slice 4?
   - Q6: Reconciliation matching — always staff-confirmed, or auto-confirm when confidence is 100% (exact amount + exact tenant reference in the bank memo)?
   - Q7: Arrears calculation — balance-forward (single running number per lease) or line-item (per-charge status)? Recommend line-item.
   - Q8: What does Slice 2 do when a tenant overpays? (Credit-on-account, refund, or just leave the extra marked as "unallocated"?)
5. **Present design in sections** — stack reuse from flipmodel, data model extensions, QB connection flow, charge generation, reconciliation matcher, UI additions, integration points with Slice 1, out-of-scope, dashboard deltas. Get approval per section.
6. **Write spec** to `docs/superpowers/specs/YYYY-MM-DD-billing-quickbooks-design.md` (use today's date from the `currentDate` line in the system prompt). Commit.
7. **Self-review** per the brainstorming skill. Fix inline.
8. **User review gate.** Wait for approval.
9. **Invoke `superpowers:writing-plans`** for Slice 2's implementation plan. Do not invoke any other skill.

## 7. Slice 2 integration points with Slice 1 (checklist to preserve during design)

Mark every one of these explicitly in the Slice 2 spec so nothing gets lost:

- [ ] **Lease activation triggers charge generation.** Hook into `activateLease` in `lib/services/leases.ts` without changing its signature for existing callers.
- [ ] **Lease termination voids future-dated unpaid charges.** `terminateLease` must call a new `voidChargesAfter(leaseId, date)` service and short-circuit if QB invoices already exist (those need explicit cancellation in QB).
- [ ] **Lease renewal** creates a new lease row with `renewedFromId` — charge generation for the successor starts from `startDate`, predecessor's remaining schedule stops at `endDate`.
- [ ] **Rent or due-day changes on a DRAFT lease** must regenerate any pre-existing schedule rows (but a DRAFT lease shouldn't have schedule rows yet — clarify this during design).
- [ ] **Lease rent change after activation** — Slice 2 decision needed: does editing an ACTIVE lease's rent amount require terminating and creating a new lease, or do we allow mid-lease rent change with a "rent change effective date" that resets the schedule from that point? *Recommend: out of scope for Slice 2. Document as a post-POC feature.*
- [ ] **`Lease.heldInTrustAccount`** drives which QB account the deposit invoice is booked against. Surface in the org chart-of-accounts mapping as two accounts: "Rent income" and "Deposits held in trust".
- [ ] **Dashboard widgets** grow: arrears total, this-month-expected, this-month-received, count of overdue charges. Add to `/api/dashboard/summary` and to the dashboard page. Must not break Slice 1's existing widgets.
- [ ] **Role enforcement:** generating schedules + mapping accounts is ADMIN-only; viewing + confirming reconciliations is ADMIN + FINANCE + PROPERTY_MANAGER; tenants still have no UI.
- [ ] **Cross-org isolation** — every new model carries `orgId`. Every QB API call scopes to the calling org's stored credentials. Never leak QB data across orgs.
- [ ] **Manual acceptance walkthrough** — add a new Slice 2 section to the plan's acceptance checklist. Do not touch Slice 1's checklist.

## 8. Secrets / environment

- Neon Postgres account exists (free plan), user has the connection strings in a gitignored `.env.local`. Not yet created in the repo because Slice 1 hasn't been implemented.
- Vercel Blob: token goes in `BLOB_READ_WRITE_TOKEN`.
- QB OAuth: Slice 2 will add `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_REDIRECT_URI`, `QB_ENVIRONMENT` (sandbox vs production), and per-org encrypted token storage (flipmodel's pattern).

## 9. What NOT to do

- Do **not** start implementing Slice 1. The user wants both slice specs finalized before code is written.
- Do **not** re-open Slice 1's settled decisions (lease state machine, DRAFT-invisible occupancy, tenant email nullable, no email invites, etc.) unless a hard contradiction emerges from Slice 2.
- Do **not** add Stripe to Slice 2. It was explicitly redirected away from Stripe.
- Do **not** add automated tests to the Slice 2 plan. Testing is Slice 4.
- Do **not** fork flipmodel or link to it as a dependency. Copy code in, adapt, keep this repo standalone.
- Do **not** skip the brainstorming skill → writing-plans handoff. It is a hard gate.
- Do **not** skip asking Q1 before presenting design.

---

**Resume instructions for the next Claude:**
> Read this handover file. Invoke `superpowers:brainstorming`. State in one sentence that you've read the handover and understand Slice 2 has pivoted from Stripe to QuickBooks. Ask Q1 exactly as written in §4.4.
