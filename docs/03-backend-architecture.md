# ShopIt — Backend Architecture

## Where Code Runs

Next.js App Router gives us three execution contexts. Pick the right one:

| Context | Use for | Example |
|---------|---------|---------|
| **Server Components** | Reading data, rendering pages | List page, product cards |
| **Server Actions** | Mutations triggered by user interaction | Create list, shortlist product, post comment |
| **API Routes** (`route.ts`) | Webhooks, long-running AI pipelines, external callbacks | URL ingestion, expert opinion generation |

**Rule of thumb:** If it's a user clicking a button → Server Action. If it's async processing or needs streaming → API Route. If it's just displaying data → Server Component with direct Supabase query.

We do NOT use Supabase Edge Functions. Next.js API routes on Vercel serve the same purpose, and keeping everything in one codebase/runtime is simpler.

---

## Supabase Client Setup

Two clients, created via utility functions in `lib/supabase/`:

```
lib/supabase/
  server.ts    — createServerClient() for Server Components & Actions (uses cookies)
  client.ts    — createBrowserClient() for client-side Realtime subscriptions
```

The server client reads the user's session from cookies (Supabase Auth + Next.js middleware). All queries go through RLS — no `service_role` key in the app except for the ingestion pipeline (which writes AI-generated data as "system").

For the ingestion pipeline and AI operations that write on behalf of the system, we use a `service_role` client scoped to a single `lib/supabase/admin.ts` file. This bypasses RLS intentionally — the AI is writing data that no single user "owns".

---

## Auth Flow

Supabase Auth with magic links (email OTP). No passwords.

```
1. User enters email → Supabase sends magic link
2. User clicks link → redirected to /auth/callback
3. /auth/callback exchanges code for session → sets cookie
4. Middleware checks cookie on every request → redirects unauthenticated users to /login
```

**Middleware** (`middleware.ts`): Refreshes the Supabase session on every request. Redirects unauthenticated users away from protected routes. Light — no DB calls, just token refresh.

**Profile creation:** A Supabase database trigger (`on auth.users insert`) creates the `profiles` row automatically. The app never manually inserts into `profiles`.

---

## API Routes

### Route Map

```
app/api/
  products/
    ingest/route.ts        POST — URL ingestion pipeline (scrape + extract)
  lists/
    [listId]/
      expert-opinion/route.ts   POST — generate/regenerate expert opinion
```

That's it for v1. Everything else (CRUD for lists, products, comments, members) is Server Actions — they don't need dedicated API routes.

### Why so few routes?

CRUD operations are simple Supabase queries. Server Actions handle them cleanly with form validation, optimistic UI, and `revalidatePath`. API routes are reserved for operations that:
- Call external services (Firecrawl/Jina, Gemini)
- Take more than a few seconds
- Need to stream progress to the client

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
POST /api/products/ingest
Body: { listId, url }

┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Validate   │────▶│   Scrape     │────▶│  AI Extract  │────▶│    Store     │
│  & Insert   │     │  (Firecrawl) │     │   (Gemini)   │     │  (Supabase)  │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
      │                                                              │
      ▼                                                              ▼
  Return product ID                                        Realtime pushes
  immediately (status: pending)                            update to UI
```

### Step by step:

**1. Validate & Insert (immediate response)**
```
- Authenticate user, verify list membership (editor+)
- Validate URL format
- Extract domain from URL
- Insert product row: extraction_status = 'pending', url, domain, list_id, added_by
- Return { productId } to the client immediately (202 Accepted)
- Continue processing in the background (see below)
```

**2. Background processing**

The rest happens after the response is sent. We use `waitUntil()` (Vercel's API for background work in serverless functions) to continue processing without blocking the response.

```
- Update extraction_status → 'processing'
- Call Firecrawl/Jina to scrape the URL → get page content (markdown/HTML)
- Store raw response in raw_scraped_data
- Send scraped content to Gemini with extraction prompt
- Parse Gemini's structured output
- Update product row with extracted fields:
    title, brand, model, image_url,
    price_min, price_max, currency, price_note,
    specs (jsonb), pros, cons,
    rating, review_count,
    ai_summary, ai_review_summary, ai_verdict
- Set extraction_status → 'completed', ai_extracted_at → now()
- On any error: set extraction_status → 'failed', extraction_error → message
```

**3. Client receives updates via Supabase Realtime**

The client subscribes to changes on the product row. When `extraction_status` changes from `pending` → `processing` → `completed`, the UI updates the product card in real-time (loading skeleton → populated card).

### Gemini Extraction Prompt

The extraction prompt asks Gemini to return structured JSON. Key design:

```
Input:  scraped page content (markdown) + product URL + list category (optional hint)
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
  "ai_summary": "One paragraph overview...",
  "ai_review_summary": "What reviewers consistently say...",
  "ai_verdict": "Best value under ₹30K"
}
```

We use Gemini's structured output mode (JSON schema response) to enforce the shape. This avoids parsing issues and retries.

### Error Handling

- **Scraping fails** (site blocks, timeout, 404): Mark `failed`, store error. User can retry via "Re-extract" button.
- **Gemini fails** (rate limit, malformed response): Same — mark `failed`. Raw data is preserved so retry doesn't re-scrape.
- **Partial extraction** (Gemini returns some fields but not others): Accept what we get. Null fields are fine — the UI handles missing data gracefully (shows "—" or hides the section).

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
- Fetch list metadata (budget_min, budget_max, purchase_by, category)
- Require at least 2 products (can't "compare" one product)
```

**2. Build Gemini prompt**

The prompt includes:
- All product data (title, price, specs, pros/cons, rating, ai_summary)
- Budget constraints (if set)
- Purchase deadline (if set)
- List category (if set)
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
- Set generated_at = now(), model_version = "gemini-2.0-flash" (or whichever)
- Return the opinion to the client
```

**4. Staleness detection (client-side)**

The client compares `list_ai_opinions.product_count` with the current product count. If they differ, show a banner: "Expert opinion may be outdated — products have changed since it was generated. Regenerate?"

---

## AI Comparison Notes

When a new product is added to a list that already has products, we want to update `ai_comparison_notes` on all products. This runs as part of the ingestion pipeline (after extraction completes):

```
After successful extraction:
  - Count other completed products in the same list
  - If count >= 1:
    - Fetch all completed products
    - Send to Gemini: "Compare this new product against the others"
    - Update ai_comparison_notes on the new product
    - Optionally update ai_comparison_notes on existing products too
```

For v1, we only update the NEW product's comparison notes. Updating all products on every addition gets expensive with large lists. The "Get Expert Opinion" button handles the holistic comparison.

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
    products/
      ingest/route.ts              # URL ingestion pipeline
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
    server.ts                      # Server-side Supabase client
    client.ts                      # Browser-side Supabase client
    admin.ts                       # Service role client (AI writes)
  actions/
    lists.ts                       # List CRUD actions
    products.ts                    # Product CRUD + shortlist/purchase actions
    members.ts                     # Member management actions
    comments.ts                    # Comment CRUD actions
  ai/
    extract.ts                     # Gemini extraction prompt + parsing
    expert-opinion.ts              # Expert Opinion prompt + parsing
    prompts.ts                     # Shared prompt templates
  scraper/
    index.ts                       # Firecrawl/Jina client wrapper
    parse-url.ts                   # URL validation, domain extraction
  validators/
    lists.ts                       # Zod schemas for list inputs
    products.ts                    # Zod schemas for product inputs
    members.ts                     # Zod schemas for member inputs

middleware.ts                      # Auth session refresh + route protection
```

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-only, for AI writes

# AI
GEMINI_API_KEY=

# Scraping
FIRECRAWL_API_KEY=                  # or JINA_API_KEY

# App
NEXT_PUBLIC_APP_URL=                # for auth redirects
```

---

## What's NOT in v1 Backend

- **Cron jobs / scheduled tasks** — no price tracking, no auto-refresh of stale products
- **Webhooks from external services** — no payment, no notifications beyond Supabase Realtime
- **File uploads** — no user-uploaded images; `image_url` comes from scraping
- **Search / full-text** — product list is small enough for client-side filtering
- **Caching layer** — at family scale, Supabase queries are fast enough without Redis
- **Queue system** — `waitUntil()` handles background processing; no need for BullMQ/etc for v1
