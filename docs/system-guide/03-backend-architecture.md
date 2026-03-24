# ShopIt — Backend Architecture

## Where Code Runs

Next.js App Router gives us three execution contexts. Pick the right one:

| Context | Use for | Example |
|---------|---------|---------|
| **Server Components** | Reading data, rendering pages | List page, product cards |
| **Server Actions** | Mutations triggered by user interaction | Create list, shortlist product, post comment |
| **API Routes** (`route.ts`) | Webhooks, long-running AI pipelines, external callbacks | URL ingestion, expert opinion generation |

**Rule of thumb:** If it's a user clicking a button → Server Action. If it's async processing or needs streaming → API Route. If it's just displaying data → Server Component with direct Supabase query.

We use one **Supabase Edge Function** for the URL ingestion worker (scraping + extraction). This is the one place where Vercel's Hobby plan 60s timeout is too short — scraping an arbitrary site + Gemini extraction can take 30-90s. Supabase Edge Functions run on Deno Deploy with a 400s wall-clock limit, which gives plenty of headroom. Everything else stays in Next.js.

---

## Supabase Client Setup

Three clients, created via utility functions in `lib/supabase/`:

```
lib/supabase/
  server.ts    — createServerClient() for Server Components & Actions (uses cookies, publishable key)
  client.ts    — createBrowserClient() for client-side Realtime subscriptions (publishable key)
  admin.ts     — createAdminClient() for AI writes that bypass RLS (secret key)
```

The server client reads the user's session from cookies (Supabase Auth + Next.js proxy). All queries go through RLS — the publishable key (`pk_...`) is used. No secret key in the app except for the AI pipelines.

For the Expert Opinion API route, we use the admin client from `lib/supabase/admin.ts` with the secret key (`sk_...`). This bypasses RLS intentionally — the AI is writing data that no single user "owns".

The `ingest-product` Edge Function creates its own Supabase client using `Deno.env` (Supabase automatically injects the secret key into Edge Functions). It bypasses RLS to update product rows with extracted data.

---

## Auth Flow

Supabase Auth with magic links (email OTP). No passwords.

```
1. User enters email → Supabase sends magic link
2. User clicks link → redirected to /auth/callback
3. /auth/callback exchanges code for session → sets cookie
4. Middleware checks cookie on every request → redirects unauthenticated users to /login
```

**Proxy** (`proxy.ts` — Next.js 16 renamed `middleware.ts` to `proxy.ts`): Refreshes the Supabase session on every request. Redirects unauthenticated users away from protected routes. Light — no DB calls, just token refresh. Session refresh helper lives in `lib/supabase/proxy.ts`.

**Profile creation:** A Supabase database trigger (`on auth.users insert`) creates the `profiles` row automatically. The app never manually inserts into `profiles`.

---

## API Routes

### Route Map

```
app/api/
  lists/
    [listId]/
      expert-opinion/route.ts   POST — generate/regenerate expert opinion
```

That's it — one API route for v1. URL ingestion is handled by a Supabase Edge Function (see below). Everything else (CRUD for lists, products, comments, members) is Server Actions.

### Why so few routes?

CRUD operations are simple Supabase queries. Server Actions handle them cleanly with form validation, optimistic UI, and `revalidatePath`. API routes are reserved for operations that:
- Call external services (Gemini) with meaningful processing time
- Need to return structured results beyond a simple mutation

URL ingestion is offloaded to a Supabase Edge Function because it can exceed Vercel Hobby's 60s timeout.

---

## Server Actions

Organized by domain in `lib/actions/`:

```
lib/actions/
  lists.ts          — createList, updateList, archiveList
  products.ts       — addProduct, updateProduct, archiveProduct,
                      toggleShortlist, markPurchased
  members.ts        — inviteMember, removeMember, updateRole, acceptInvite
  comments.ts       — addComment, updateComment, deleteComment
```

Each action:
1. Gets the authenticated user from cookies
2. Validates input (zod schemas)
3. Checks authorization (is user a member of this list? right role?)
4. Executes the Supabase query
5. Calls `revalidatePath` to refresh the page

**Authorization pattern:** RLS handles most access control at the DB level. But Server Actions still verify membership before write operations — defense in depth. For example, `toggleShortlist` checks that the user is an `editor` or `owner` of the list before updating.

---

## URL Ingestion Pipeline

This is the core backend flow. User pastes a URL → we scrape, extract, and store structured product data.

```
User pastes URL
      │
      ▼
┌─────────────┐   DB trigger    ┌──────────────────────────────────────┐
│  Server     │ ──────────────▶ │  Supabase Edge Function (worker)    │
│  Action:    │                 │                                      │
│  Insert     │                 │  1. Scrape URL (Firecrawl)           │
│  product    │                 │  2. Extract with Gemini              │
│  (pending)  │                 │  3. Update product row (completed)   │
└─────────────┘                 └──────────────────────────────────────┘
      │                                        │
      ▼                                        ▼
  UI shows                            Realtime pushes
  skeleton card                       update to UI
```

### Step by step:

**1. Insert product (Server Action — instant)**
```
- Authenticate user, verify list membership (editor+)
- Validate URL format
- Extract domain from URL
- Insert product row: extraction_status = 'pending', url, domain, list_id, added_by
- UI immediately shows a skeleton card for the new product
```

This is a regular Server Action (`lib/actions/products.ts` → `addProduct`), not an API route. It returns instantly.

**2. Queue pickup (Supabase Database Webhook → Edge Function)**

A Supabase Database Webhook fires on `INSERT` into `products` where `extraction_status = 'pending'`. It invokes the `ingest-product` Edge Function with the product ID.

```
supabase/functions/ingest-product/index.ts

- Receive { productId } from webhook payload
- Fetch the product row (url, domain)
- Fetch list metadata (category, priorities)
- Fetch adding user's profile.context
- Update extraction_status → 'processing'
- Call Firecrawl to scrape the URL → get page content (markdown)
- Store raw response in raw_scraped_data
- Send scraped content to Gemini with extraction prompt
- Parse Gemini's structured output
- Update product row with extracted fields:
    title, brand, model, image_url,
    price_min, price_max, currency, price_note,
    specs (jsonb), pros, cons,
    rating, review_count, scraped_reviews (jsonb),
    ai_summary, ai_review_summary, ai_verdict
- Set extraction_status → 'completed', ai_extracted_at → now()
- On any error: set extraction_status → 'failed', extraction_error → message
```

**Why a Supabase Edge Function instead of a Next.js API route?**
- Vercel Hobby has a 60s function timeout. Scraping an arbitrary site (not just Amazon — independent blogs, niche stores, review sites) + Gemini extraction can take 30-90s.
- Supabase Edge Functions have a 400s wall-clock limit. Plenty of headroom.
- The database webhook is the queue mechanism — no need for a separate queue service.
- If we upgrade to Vercel Pro (300s limit), we could move this back to a Next.js API route, but the Edge Function approach is cleaner regardless.

**3. Client receives updates via Supabase Realtime**

The client subscribes to changes on the product row. When `extraction_status` changes from `pending` → `processing` → `completed`, the UI updates the product card in real-time (loading skeleton → populated card).

### Scraping: Beyond Big E-Commerce

Firecrawl is the scraper, but we're not just scraping Amazon and Flipkart. Users will paste URLs from:
- **Independent stores** (D2C brands, niche retailers)
- **Review sites** (GSMArena, RTings, blog reviews)
- **Social/forum links** (Reddit threads, YouTube descriptions)
- **Aggregators** (Google Shopping results, PriceHistory pages)

The extraction prompt needs to handle wildly different page structures. Firecrawl's markdown output normalizes most of this, but the Gemini prompt must be robust to:
- Pages with no price (review sites) → `price_min`/`price_max` = null
- Pages with no reviews → `scraped_reviews` = [], `rating` = null
- Pages with multiple products → extract the one most relevant to the URL
- Non-English pages → extract what's possible, transliterate if needed

### Gemini Extraction Prompt

The extraction prompt asks Gemini to return structured JSON. Key design:

```
Input:
  - scraped page content (markdown)
  - product URL
  - list category (optional hint)
  - list priorities (e.g. ["noise level", "energy efficiency"]) — guides what specs/pros/cons to emphasize
  - user context (e.g. {room_size: "12x14", city: "Mumbai"}) — grounds the AI summary in the user's situation
Output: JSON matching our product schema

{
  "title": "...",
  "brand": "...",
  "model": "...",
  "image_url": "...",
  "price_min": 29999,
  "price_max": null,
  "currency": "INR",
  "price_note": "Sale ends Apr 1",
  "specs": { "screen_size": "55\"", "resolution": "4K", ... },
  "pros": ["Great picture quality", "Good sound", ...],
  "cons": ["No Dolby Vision", "Plastic build", ...],
  "rating": 4.3,
  "review_count": 1247,
  "scraped_reviews": [
    { "snippet": "Best TV I've bought...", "rating": 5, "source": "Amazon.in" },
    { "snippet": "Decent for the price but backlight bleed...", "rating": 3, "source": "Amazon.in" }
  ],
  "ai_summary": "One paragraph overview...",
  "ai_review_summary": "What reviewers consistently say...",
  "ai_verdict": "Best value under ₹30K"
}
```

We use Gemini's structured output mode (JSON schema response) to enforce the shape. This avoids parsing issues and retries.

`scraped_reviews` captures review excerpts found on the page. `ai_review_summary` is Gemini's synthesis of those reviews into a readable paragraph. Both are stored — raw snippets for future re-summarization, summary for display.

### Error Handling

- **Scraping fails** (site blocks, timeout, 404): Mark `failed`, store error. User can retry via "Re-extract" button which re-inserts with `pending` status, triggering the webhook again.
- **Gemini fails** (rate limit, malformed response): Same — mark `failed`. Raw data is preserved so retry doesn't re-scrape.
- **Partial extraction** (Gemini returns some fields but not others): Accept what we get. Null fields are fine — the UI handles missing data gracefully (shows "—" or hides the section).
- **Edge Function crashes**: Supabase logs the error. Product stays in `processing` state. A future improvement could be a "stuck detection" check (if `processing` for > 5 minutes, reset to `failed`).

### Rate Limiting

For v1 (family use), no rate limiting needed. If we open up, we'd add:
- Per-user limit: 50 ingestions/day
- Per-list limit: 100 products

---

## Expert Opinion Pipeline

User clicks "Get Expert Opinion" → we send all products in the list to Gemini → store the structured result.

```
POST /api/lists/[listId]/expert-opinion

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Gather all   │────▶│  Gemini      │────▶│   Upsert     │
│ products     │     │  analysis    │     │  list_ai_    │
│ in list      │     │              │     │  opinions    │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Step by step:

**1. Gather context**
```
- Authenticate user, verify list membership
- Fetch all non-archived products in the list (with their extracted data)
- Fetch list metadata (budget_min, budget_max, purchase_by, category, priorities)
- Fetch requesting user's profile.context
- Require at least 2 products (can't "compare" one product)
```

**2. Build Gemini prompt**

The prompt includes:
- All product data (title, price, specs, pros/cons, rating, ai_summary)
- Budget constraints (if set)
- Purchase deadline (if set)
- List category (if set)
- **User priorities** (e.g. ["noise level", "energy efficiency"]) — AI weights these in its comparison and verdict
- **User context** (e.g. {room_size: "12x14", city: "Mumbai"}) — AI grounds recommendations in the user's situation
- Instruction to return structured JSON

```
Output JSON:
{
  "top_pick": "<product_id>",
  "top_pick_reason": "...",
  "value_pick": "<product_id>",
  "value_pick_reason": "...",
  "summary": "Based on your 4 options...",
  "comparison": "Detailed prose comparing products...",
  "concerns": "Watch out for...",
  "verdict": "Final recommendation..."
}
```

**3. Store result**
```
- Upsert into list_ai_opinions (insert or update if exists)
- Set product_count = number of products analyzed
- Set generated_at = now(), model_version = "gemini-3.1-flash-lite-preview" (or whichever)
- Return the opinion to the client
```

**4. Staleness detection (client-side)**

The client compares `list_ai_opinions.product_count` with the current product count. If they differ, show a banner: "Expert opinion may be outdated — products have changed since it was generated. Regenerate?"

---

## Realtime Subscriptions

Client-side Supabase Realtime for live updates. Two subscriptions:

**1. Product changes in a list**
```typescript
supabase
  .channel('list-products')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'products',
    filter: `list_id=eq.${listId}`
  }, handler)
  .subscribe()
```

This powers:
- Extraction progress (pending → processing → completed)
- Collaborative updates (another family member adds/shortlists a product)

**2. Comments on a product** (when viewing product detail)
```typescript
supabase
  .channel('product-comments')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'comments',
    filter: `product_id=eq.${productId}`
  }, handler)
  .subscribe()
```

---

## Folder Structure (Backend)

```
app/
  api/
    lists/
      [listId]/
        expert-opinion/route.ts    # Expert Opinion generation
  auth/
    callback/route.ts              # Magic link callback
  (app)/                           # Route group for authenticated pages
    layout.tsx
    lists/
      page.tsx                     # All lists
      [listId]/
        page.tsx                   # Single list (product table)
        settings/page.tsx          # List settings, members

lib/
  supabase/
    server.ts                      # Server-side Supabase client (publishable key, cookies)
    client.ts                      # Browser-side Supabase client (publishable key)
    admin.ts                       # Admin client with secret key (bypasses RLS, AI writes)
    proxy.ts                       # Session refresh helper (used by proxy.ts at root)
    auth.ts                        # getAuthenticatedUser() helper for Server Actions
  actions/
    lists.ts                       # List CRUD actions
    products.ts                    # Product CRUD + shortlist/purchase + addProduct (insert)
    members.ts                     # Member management actions
    comments.ts                    # Comment CRUD actions
  ai/
    expert-opinion.ts              # Expert Opinion prompt + parsing
    prompts.ts                     # Shared prompt templates
  validators/
    lists.ts                       # Zod schemas for list inputs
    products.ts                    # Zod schemas for product inputs
    members.ts                     # Zod schemas for member inputs

supabase/
  functions/
    ingest-product/index.ts        # Edge Function: scrape + extract worker
  migrations/                      # SQL migrations (schema, RLS, triggers)

proxy.ts                           # Auth session refresh + route protection (Next.js 16)
```

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=                    # Project URL (Settings > API)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=        # Publishable API key (pk_...), client-safe, respects RLS
SUPABASE_SECRET_KEY=                         # Secret API key (sk_...), server-only, bypasses RLS — for AI writes
                                             # Falls back to SUPABASE_SERVICE_ROLE_KEY if set (legacy name)

# AI
GEMINI_API_KEY=

# Scraping
FIRECRAWL_API_KEY=

# App
NEXT_PUBLIC_APP_URL=                         # for auth redirects
```

> **Key naming:** Supabase renamed `anon key` → `publishable key` (`pk_...`) and `service_role key` → `secret key` (`sk_...`). Our code uses the new names. The admin client (`lib/supabase/admin.ts`) accepts either `SUPABASE_SECRET_KEY` or the legacy `SUPABASE_SERVICE_ROLE_KEY`.

---

## What's NOT in v1 Backend

- **Cron jobs / scheduled tasks** — no price tracking, no auto-refresh of stale products
- **Webhooks from external services** — no payment, no notifications beyond Supabase Realtime
- **File uploads** — no user-uploaded images; `image_url` comes from scraping
- **Search / full-text** — product list is small enough for client-side filtering
- **Caching layer** — at family scale, Supabase queries are fast enough without Redis
- **Queue system** — Supabase Database Webhook + Edge Function is the queue; no need for BullMQ/Redis
