## Phase A — Scaffolding

### Task 1: Initialize Next.js project + core deps

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `.gitignore`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Scaffold Next.js 16 app**

Run from repo root (`C:\Users\liamp\Desktop\Property Management Ops`):

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --no-turbopack
```

When prompted to overwrite existing files, answer **No** for any files already committed; **Yes** for new scaffolding.

- [ ] **Step 2: Install runtime deps**

```bash
npm install next@16 react@19 react-dom@19 \
  prisma@^7 @prisma/client@^7 @prisma/adapter-pg@^7 pg@^8 \
  next-auth@5.0.0-beta.30 @auth/prisma-adapter@^2 bcryptjs@^3 \
  zod@^4 \
  @vercel/blob \
  @sentry/nextjs@^10
```

- [ ] **Step 3: Install dev deps**

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

- [ ] **Step 5: Verify build chain**

```bash
npm run typecheck
npm run lint
```

Expected: both pass on the vanilla scaffold.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 + core deps"
```

---

### Task 2: Environment + Neon database

**Files:**
- Create: `.env.example`, `.env.local` (gitignored)

- [ ] **Step 1: Provision a Neon project**

In the Neon dashboard create a project named `property-management-ops`. Copy the **pooled** connection string and the **direct** connection string.

- [ ] **Step 2: Write `.env.example`**

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

- [ ] **Step 3: Create `.env.local`**

Copy `.env.example` → `.env.local`, paste real Neon values, and generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- [ ] **Step 4: Ensure `.env.local` is ignored**

Verify `.gitignore` contains `.env*.local`. Add if missing.

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: env template + Neon wiring"
```

---

### Task 3: Prettier + folder layout

**Files:**
- Create: `.prettierrc`, `.prettierignore`
- Create empty dirs via `.gitkeep`: `lib/`, `lib/services/`, `lib/auth/`, `lib/zod/`, `components/`, `components/forms/`, `components/nav/`, `components/ui/`, `types/`

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

- [ ] **Step 2: Create empty dirs**

```bash
mkdir -p lib/services lib/auth lib/zod components/forms components/nav components/ui types
touch lib/.gitkeep lib/services/.gitkeep lib/auth/.gitkeep lib/zod/.gitkeep components/forms/.gitkeep components/nav/.gitkeep components/ui/.gitkeep types/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: prettier + folder skeleton"
```

---

