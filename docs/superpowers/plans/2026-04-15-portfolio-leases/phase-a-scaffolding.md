## Phase A — Scaffolding

**Per-task convention:** run `npm run typecheck` after each task, then commit with the message noted at the end of the task.

### Task 1: Initialize Next.js project + core deps

Run from repo root (`C:\Users\liamp\Desktop\Property Management Ops`):

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --no-turbopack
```

When prompted to overwrite existing files, answer **No** for any files already committed; **Yes** for new scaffolding.

```bash
npm install next@16 react@19 react-dom@19 \
  prisma@^7 @prisma/client@^7 @prisma/adapter-pg@^7 pg@^8 \
  next-auth@5.0.0-beta.30 @auth/prisma-adapter@^2 bcryptjs@^3 \
  zod@^4 \
  @vercel/blob \
  @sentry/nextjs@^10
```

```bash
npm install -D @types/bcryptjs @types/pg tsx
```

- [ ] **Step 4: Pin Node version + scripts**

Edit `package.json` — set `"engines": { "node": ">=20.11" }` and replace the `scripts` block:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset --force"
  }
}
```

Expected: both pass on the vanilla scaffold.

**Commit:** `chore: scaffold Next.js 16 + core deps`

---

### Task 2: Environment + Neon database

- [ ] **Step 1: Provision a Neon project**

In the Neon dashboard create a project named `property-management-ops`. Copy the **pooled** connection string and the **direct** connection string.

```bash
# .env.example
DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
DIRECT_URL="postgres://user:pass@host/db?sslmode=require"

NEXTAUTH_SECRET="replace-me-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

SENTRY_DSN=""
EXPIRING_WINDOW_DAYS="60"
```

Copy `.env.example` → `.env.local`, paste real Neon values, and generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- [ ] **Step 4: Ensure `.env.local` is ignored**

Verify `.gitignore` contains `.env*.local`. Add if missing.

**Commit:** `chore: env template + Neon wiring`

---

### Task 3: Prettier + folder layout

- [ ] **Step 1: Prettier config**

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

```
# .prettierignore
.next
node_modules
prisma/migrations
public
```

Install plugin:

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

```bash
mkdir -p lib/services lib/auth lib/zod components/forms components/nav components/ui types
touch lib/.gitkeep lib/services/.gitkeep lib/auth/.gitkeep lib/zod/.gitkeep components/forms/.gitkeep components/nav/.gitkeep components/ui/.gitkeep types/.gitkeep
```

**Commit:** `chore: prettier + folder skeleton`

---
