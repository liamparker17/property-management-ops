# Property Management Ops — Slice 1 Implementation Plan

> **For agentic workers:** This file is the **index only** (≈70 lines — safe to load in full). Do NOT read the whole plan body — the implementation lives in `2026-04-15-portfolio-leases/phase-*.md`, one file per phase, and each file has been stripped of ceremonial scaffolding (no `**Files:**` duplication, no `- [ ] Step N:` ritual headers, no commit/typecheck bash blocks — just the code, the invariants, and a one-line `**Commit:**` footer per task). Read the **current phase file** listed in the Phase Map below, implement it, commit, update the status line + append to the Deviations log, then move to the next phase. Recommended skill: `superpowers:subagent-driven-development` (fresh subagent per phase with only that phase's file attached).

**Goal:** Build a Next.js 16 web app that lets property management staff create properties, units, tenants, and leases end-to-end — proving the core data model. No money flow, no tenant self-service (both come in later slices).

**Architecture:** App Router with three route groups: `(marketing)` (public), `(staff)` (admin/property_manager/finance), `(tenant)` (empty shell, Slice 3). REST API under `app/api/*` delegates to a service layer in `lib/services/*` that owns all business rules and talks to Prisma. Every domain model carries `orgId`. A single `withOrg()` wrapper injects org/role into every handler; `proxy.ts` middleware gates route groups by role.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · Prisma 7 + `@prisma/adapter-pg` · Neon Postgres · NextAuth v5 · Zod · Vercel Blob · Tailwind CSS · shadcn/ui · bcryptjs · Sentry (optional)

**Spec:** `docs/superpowers/specs/2026-04-15-portfolio-leases-design.md`

---

## Deviation from default TDD flow

The spec explicitly defers automated testing to Slice 4. Every task uses **manual verification** (typecheck, lint, dev-server smoke) instead of failing-test-first. This is a user-approved exception to the skill's TDD mandate — an executor must not "correct" it. Test infrastructure (Vitest, Playwright, CI) is a Slice 4 deliverable. Regressions are accepted risk until then.

---

## Execution protocol (READ BEFORE DISPATCHING)

1. **Never** read the whole plan. Read only the one phase file you are about to execute.
2. **Gate on the phase map below.** Start with the first phase whose status is `PENDING`. When it finishes, update its status line to `COMPLETE <commit-range>` and move to the next.
3. **One phase per subagent.** Dispatch a fresh subagent with ONLY the relevant `phase-*.md` file attached (path listed below). Provide the running "Deviations log" so the subagent knows what earlier phases actually produced vs. what the plan specified.
4. **Blockers that need the human** (e.g. Neon provisioning, secrets) live in the **Blockers** section below; do not try to route around them.
5. **Append, don't rewrite.** When a phase finishes, append to the Deviations log — don't edit in place. The log is the authoritative record of what shipped.

---

## Phase Map

| Phase | File | Status |
|-------|------|--------|
| A — Scaffolding (Tasks 1-3) | `2026-04-15-portfolio-leases/phase-a-scaffolding.md` | **COMPLETE** — commits `c0a4613..186faab` |
| B — Schema & DB (Tasks 4-6) | `2026-04-15-portfolio-leases/phase-b-schema-db.md` | PENDING — **blocked on Neon provisioning (see Blockers §1)** |
| C — Auth & infra (Tasks 7-10) | `2026-04-15-portfolio-leases/phase-c-auth-infra.md` | PENDING |
| D — Service layer (Tasks 11-17) | `2026-04-15-portfolio-leases/phase-d-service-layer.md` | PENDING |
| E — API routes (Tasks 18-21) | `2026-04-15-portfolio-leases/phase-e-api-routes.md` | PENDING |
| F — UI foundation (Tasks 23-25) | `2026-04-15-portfolio-leases/phase-f-ui-foundation.md` | PENDING |
| G — Portfolio UI (Tasks 26-28) | `2026-04-15-portfolio-leases/phase-g-portfolio-ui.md` | PENDING |
| H — Tenants & leases UI (Tasks 29-32) | `2026-04-15-portfolio-leases/phase-h-tenants-leases-ui.md` | PENDING |
| I — Settings & seed (Tasks 33-35) | `2026-04-15-portfolio-leases/phase-i-settings-seed.md` | PENDING |
| J — Manual acceptance + README (Task 36) | `2026-04-15-portfolio-leases/phase-j-acceptance.md` | PENDING |

---

## Blockers

1. **Neon database (blocks Phase B Task 5).** User must provision a Neon project named `property-management-ops`, copy the **pooled** connection string into `DATABASE_URL` and the **direct** connection string into `DIRECT_URL` in `.env.local`, then tell the executor to resume. `.env.local` currently has placeholder Neon values and a real generated `NEXTAUTH_SECRET`.

---

## Deviations log

Append-only. Each entry records what the phase actually produced when it differed from the phase file, so later phases don't assume the unadjusted spec.

### Phase A — Scaffolding (commits c0a4613, 6462ad0, 186faab)

- **Scaffold created in a sibling temp dir then copied in.** `npx create-next-app .` refused to use the working directory name (`Property Management Ops`) because the folder name contains spaces and capitals, which npm rejects as a package name. Workaround: scaffolded into `~/Desktop/pmops-scaffold`, stripped `.git/ .next/ node_modules/ AGENTS.md CLAUDE.md README.md`, copied the remaining files in, ran `npm install` in place, then deleted the temp dir. The `package.json` `name` field was rewritten to `pmops` before install.
- **`next.config.ts`, not `next.config.mjs`.** `create-next-app` in Next 16 produces a `.ts` config by default. The plan's reference to `.mjs` is outdated; no functional impact.
- **`lint` script is `eslint`, not `next lint`.** Next 16 removed the `next lint` subcommand (it errors: "Invalid project directory provided, no such directory: .../lint"). `package.json` uses `"lint": "eslint"` directly, matching the scaffold-generated `eslint.config.mjs`. Later phases should call `npm run lint` as normal.
- **`.gitignore` env pattern rewritten.** Scaffold produced `.env*` which would have ignored `.env.example` too. Rewrote to `.env` + `.env*.local` so templates commit but local files do not.
- **`--src-dir=false` flag dropped** from `create-next-app` invocation (unsupported in current version; app lives at repo root `app/` as intended).
- **`.env.local` contains a real generated `NEXTAUTH_SECRET`.** Everything else in `.env.local` is a placeholder until Blocker §1 is resolved.
- **Dependencies installed exactly as planned.** `prisma@^7 @prisma/client@^7 @prisma/adapter-pg@^7 pg@^8 next-auth@5.0.0-beta.30 @auth/prisma-adapter@^2 bcryptjs@^3 zod@^4 @vercel/blob @sentry/nextjs@^10` and dev deps `@types/bcryptjs @types/pg tsx prettier prettier-plugin-tailwindcss`. Resolved versions recorded in `package-lock.json`.
- **npm audit reports 3 moderate vulnerabilities** (transitive, not addressed). Plan is silent on audit; revisit at Slice 4 when dep pinning is formalized.
- **Verification:** `npm run typecheck` → ✅ clean. `npm run lint` → ✅ clean (after the `next lint` → `eslint` fix above).

### Plan restructure (not a Phase — meta)

- **Plan split into per-phase files and trimmed of ceremony.** Two subsequent commits (`f514e12` trim + the earlier split commit) reorganised the original 5525-line monolith into `2026-04-15-portfolio-leases/phase-*.md` (10 files) with this index as the entry point. Total plan size dropped to ~5042 lines *including* this index; the individual phase files sit at 126–1063 lines each so any one subagent can hold exactly the phase it needs. A structural trimmer at `scripts/trim-plan.mjs` removes `**Files:**` sections, ceremonial step headers, and commit/typecheck bash blocks; it preserves every code block byte-for-byte and every business-rule paragraph. Rerun it against any phase file after edits to keep the style consistent: `node scripts/trim-plan.mjs docs/superpowers/plans/2026-04-15-portfolio-leases/phase-X-*.md`.
- **Phase E had a task-count bug in the original plan map** ("Tasks 18-22" but the file only contains tasks 18/19/20/21). Fixed in the phase map above.
- **Subagent permissions added to `.claude/settings.local.json`.** Background Haiku/Sonnet agents can now `Read/Write/Edit/Glob/Grep` anywhere in the project and run `npm * / npx * / node * / git *` plus common Unix file utilities without prompting. `rm` is **not** allowlisted — destructive deletes still pause for human approval. See the file for the exact rules.
