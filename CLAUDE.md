# Property Management Ops — LLM Instructions

## Manifest-First Rule (MANDATORY)

**Before reading ANY file, check `CODEBASE.md` first.** It contains:
- Every file path, its exports, and line count
- Database schema summary (models, enums, relations)
- All env var names and purposes
- API endpoint → service function mapping
- Auth flow overview

### How to apply

1. **Need to edit a file?** Check CODEBASE.md for what it exports and how many lines it has. If the manifest tells you enough, skip the Read entirely.
2. **Need to find where something lives?** Search CODEBASE.md first — it maps every export to a file. Don't Grep the codebase for a function when the manifest already tells you which file it's in.
3. **Need to understand a flow?** The manifest has the auth flow, API→service mapping, and route→page mapping. Read the relevant section before touching any files.
4. **Need env vars?** The manifest lists every env var and its purpose. Don't read .env files unless you need actual values.
5. **Adding a new file or export?** Update CODEBASE.md after creating it. The manifest must stay current.

### What you should NOT do

- Read entire files "to understand the codebase" — use the manifest
- Grep for function names across the whole project — check the manifest's export tables
- Read .env files to see what variables exist — check the manifest's env table
- Read package.json to check dependencies — the manifest lists the stack
- Read prisma/schema.prisma to understand models — check the manifest's schema table
- Read multiple API route files to understand the API surface — check the manifest's endpoint table

### When to actually Read files

- You need the **implementation details** of a specific function (the manifest tells you what it exports, not how)
- You need **exact line numbers** for an Edit operation
- You're debugging and need to trace actual code flow
- The manifest might be stale (verify before assuming)

## Architecture Quick Reference

```
proxy.ts          → route guard (JWT verification, role redirects)
lib/auth.ts       → NextAuth config (credentials, bcrypt, prisma)
lib/auth.config.ts→ edge-safe auth config (shared by proxy + layouts)
lib/auth/with-org.ts → withOrg() HOF for API route auth
lib/services/*    → all business logic (no business logic in routes/pages)
lib/zod/*         → all validation schemas
app/api/*         → thin route handlers that call services
app/(staff)/*     → staff pages (auth via layout + proxy)
app/(tenant)/*    → tenant pages (auth via layout + proxy)
components/forms/* → all form components
components/ui/*   → shadcn primitives (do not edit manually)
```

## Conventions

- **Currency:** stored as cents (integer), formatted with `formatZar()` from `lib/format.ts`
- **Soft deletes:** Properties use `deletedAt`, Tenants use `archivedAt`
- **Lease states:** DB stores LeaseState enum; display uses DerivedStatus (adds EXPIRING/EXPIRED based on dates)
- **Auth:** JWT strategy, no database sessions. Custom fields (role, orgId) in token + session via callbacks in auth.config.ts
- **API auth:** All API routes use `withOrg()` wrapper from `lib/auth/with-org.ts`
- **Errors:** Use `ApiError` class from `lib/errors.ts`, converted via `toErrorResponse()`
- **File uploads:** Vercel Blob, max 20MB, pdf/png/jpeg/webp only
- **Region:** South Africa (ZAR currency, SA provinces enum)

## Keeping the Manifest Current

When you create, rename, delete, or significantly change a file:
1. Update the relevant table in CODEBASE.md
2. If adding a new service/zod schema/component, add it to the correct section
3. If adding new env vars, add to the env table
4. If adding new API routes, add to the endpoint table
