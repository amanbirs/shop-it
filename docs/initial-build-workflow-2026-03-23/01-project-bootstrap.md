# Phase 1: Project Bootstrap

## Checklist

- [x] Create Next.js 16 project with App Router (Next.js 16.2.1, Turbopack)
- [x] Install core dependencies (shadcn, Supabase, Framer Motion, Sonner, nuqs, cmdk, zod, react-hook-form)
- [x] Initialize shadcn/ui (22 components installed)
- [x] Set up Tailwind CSS 4 with semantic tokens (shortlisted, purchased, ai-accent, extraction-pending)
- [x] Create Supabase project (manual) — project name: `shop-it`
- [x] Get API keys: Gemini, Firecrawl
- [x] Create `.env.local` with all environment variables
- [ ] Create Vercel project and link repo (manual)
- [x] Verify `npm run dev` serves the app
- [x] Set up vitest test runner

---

## Step 1: Create Next.js Project

```bash
npx create-next-app@latest shop-it \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --turbopack
```

Select options:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No (project structure uses root-level `app/`, `components/`, `lib/`)
- App Router: Yes
- Turbopack: Yes
- Import alias: `@/*`

## Step 2: Install Core Dependencies

```bash
# UI + Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-tooltip \
  @radix-ui/react-collapsible @radix-ui/react-alert-dialog \
  @radix-ui/react-avatar @radix-ui/react-toggle-group \
  class-variance-authority clsx tailwind-merge \
  lucide-react

# Forms + Validation
npm install react-hook-form @hookform/resolvers zod

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Theming
npm install next-themes

# Animation
npm install framer-motion

# Toast
npm install sonner

# URL State
npm install nuqs

# Command Palette
npm install cmdk

# Dev tools
npm install -D supabase
```

## Step 3: Initialize shadcn/ui

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Zinc**
- CSS variables: **Yes**

Then add the components we'll need:

```bash
npx shadcn@latest add button card input textarea badge separator \
  skeleton tooltip dropdown-menu dialog sheet command select \
  alert-dialog avatar toggle-group collapsible popover calendar
```

This creates `components/ui/` with all the shadcn primitives referenced in the design docs.

## Step 4: Set Up Tailwind CSS 4 Theme Tokens

File: `app/globals.css`

Replace the default shadcn theme with ShopIt's semantic tokens from `docs/system-guide/04-frontend-architecture.md`:

```css
@import "tailwindcss";

@theme {
  /* Use the semantic tokens from 04-frontend-architecture.md */
}

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --destructive: 0 84.2% 60.2%;
  --border: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;

  /* ShopIt-specific */
  --shortlisted: 45 93% 47%;
  --purchased: 142 71% 45%;
  --ai-accent: 262 83% 58%;
  --extraction-pending: 38 92% 50%;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 6%;
  --card-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --border: 240 3.7% 15.9%;

  /* ShopIt dark overrides — desaturated per 05-design-research.md */
  --shortlisted: 45 80% 50%;
  --purchased: 142 60% 48%;
  --ai-accent: 262 70% 65%;
  --extraction-pending: 38 80% 55%;
}
```

## Step 5: Create Supabase Project (Manual)

> This is a manual step — you must do this in the browser.

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name:** `shopit`
   - **Database Password:** Generate a strong password and save it somewhere safe
   - **Region:** Choose the closest region to your users (e.g., `ap-south-1` for India, `us-east-1` for US)
   - **Plan:** Free tier is fine for development
4. Click **"Create new project"** — wait ~2 minutes for provisioning
5. Once ready, go to **Settings > API** (left sidebar > gear icon > API)
6. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY` (click "Reveal" — never expose this client-side)
7. Go to **Settings > API > JWT Settings** and note the JWT secret if needed

### Enable Supabase Auth Providers

1. In the Supabase dashboard, go to **Authentication > Providers**
2. **Email (Magic Link):**
   - Ensure "Enable Email provider" is ON
   - Set "Enable Email Confirmations" to ON
   - Under "Email Templates", customize the Magic Link template if desired
3. **Google OAuth (optional for v1):**
   - Toggle ON "Google" under Providers
   - You'll need a Google Cloud project with OAuth 2.0 credentials:
     1. Go to [Google Cloud Console](https://console.cloud.google.com/)
     2. Create a new project or select existing
     3. Go to **APIs & Services > Credentials**
     4. Click **Create Credentials > OAuth client ID**
     5. Application type: **Web application**
     6. Add authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
     7. Copy **Client ID** and **Client Secret** back into the Supabase Google provider settings
4. **Site URL:** Set to `http://localhost:3000` for dev (update to production URL later)
5. **Redirect URLs:** Add `http://localhost:3000/auth/callback`

### Initialize Supabase CLI Locally

```bash
npx supabase init
npx supabase link --project-ref <your-project-ref>
```

The project ref is the ID from your Supabase project URL: `https://supabase.com/dashboard/project/<project-ref>`.

## Step 6: Get API Keys (Manual)

### Gemini API Key

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **"Create API Key"**
3. Select or create a Google Cloud project
4. Copy the generated key → `GEMINI_API_KEY`
5. The free tier gives 15 RPM for Gemini Flash — sufficient for development

### Firecrawl API Key

1. Go to [https://www.firecrawl.dev/](https://www.firecrawl.dev/)
2. Sign up / log in
3. Go to **Dashboard > API Keys**
4. Create a new key → `FIRECRAWL_API_KEY`
5. Free tier gives 500 credits — enough for ~100 URL scrapes during development

## Step 7: Create Environment Variables

File: `.env.local` (at project root)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# AI
GEMINI_API_KEY=AIza...

# Scraping
FIRECRAWL_API_KEY=fc-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add to `.gitignore` (should already be there from create-next-app):
```
.env*.local
```

### Security: Key Handling

- **`SUPABASE_SERVICE_ROLE_KEY`** is the most sensitive value. It bypasses all RLS policies. Never prefix it with `NEXT_PUBLIC_` and never import the admin client (`lib/supabase/admin.ts`) in Server Actions or Client Components. It is only used by the Expert Opinion API route and the ingestion Edge Function.
- **`GEMINI_API_KEY`** and **`FIRECRAWL_API_KEY`** are server-only. Never expose them client-side.
- **`.env*.local` must be in `.gitignore`.** Verify this before your first commit. Accidentally pushing secrets to a public repo is the #1 cause of compromised API keys.
- **Rotate keys immediately** if you ever suspect exposure. Supabase: Settings > API > regenerate. Gemini: AI Studio > API Keys > delete + recreate. Firecrawl: Dashboard > API Keys.

## Step 8: Create Vercel Project (Manual)

> Do this after you've pushed the initial commit to GitHub.

1. Push your repo to GitHub
2. Go to [https://vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Framework: **Next.js** (auto-detected)
5. Environment Variables: Add the same variables from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `FIRECRAWL_API_KEY`
   - `NEXT_PUBLIC_APP_URL` → set to your Vercel production URL (e.g., `https://shopit-xxx.vercel.app`)
6. Click **Deploy**
7. After deploy succeeds, go to **Settings > Domains** to set up a custom domain if desired

### Update Supabase Redirect URLs

After Vercel deploy, go back to Supabase dashboard:
1. **Authentication > URL Configuration**
2. Add your Vercel URL to **Redirect URLs**: `https://your-app.vercel.app/auth/callback`
3. Update **Site URL** to your production URL when going live

## Step 9: Create Project Folder Structure

Create the directory skeleton from `CLAUDE.md`:

```bash
mkdir -p app/\(auth\)/login
mkdir -p app/\(auth\)/auth/callback
mkdir -p app/\(app\)/lists/\[listId\]/settings
mkdir -p app/\(app\)/profile
mkdir -p app/api/lists/\[listId\]/expert-opinion
mkdir -p components/ui
mkdir -p components/layout
mkdir -p components/lists
mkdir -p components/products
mkdir -p components/ai
mkdir -p components/collaboration
mkdir -p components/common
mkdir -p lib/supabase
mkdir -p lib/actions
mkdir -p lib/ai
mkdir -p lib/validators
mkdir -p hooks
mkdir -p supabase/functions/ingest-product
mkdir -p supabase/migrations
```

## Step 10: Create Utility Helpers

File: `lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Verification

```bash
npm run dev
```

- App starts at `http://localhost:3000` without errors
- Tailwind styles render correctly
- shadcn components import without error
- No TypeScript errors
