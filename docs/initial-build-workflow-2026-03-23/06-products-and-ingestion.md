# Phase 6: Products & URL Ingestion

## Checklist

- [x] Build Server Actions: `addProduct`, `toggleShortlist`, `markPurchased`, `archiveProduct`, `retryExtraction` (`lib/actions/products.ts`)
- [ ] Write tests for product Server Actions
- [x] Build the Supabase Edge Function: `ingest-product` (505 lines — Firecrawl + Gemini pipeline)
- [x] Create Gemini extraction prompt (`lib/ai/prompts.ts` — already done in Phase 3)
- [x] Build add-product form (`components/products/add-product-form.tsx`)
- [x] Build product card component (`components/products/product-card.tsx`) — with skeleton/failed/completed states
- [x] Build product card skeleton (`components/products/product-card-skeleton.tsx`)
- [x] Build product grid (`components/products/product-grid.tsx`) — responsive 1/2/3 columns
- [x] Build extraction progress indicator (`components/products/extraction-progress.tsx`)
- [x] Build Realtime hook: `useRealtimeProducts` (`hooks/use-realtime-products.ts`)
- [x] Build list detail page (`app/(app)/lists/[listId]/page.tsx`) — Server Component
- [x] Build list header (`components/lists/list-header.tsx`) — budget, deadline, priorities, members
- [x] Build list filters (`components/lists/list-filters.tsx`) — All/Shortlisted/Purchased
- [x] Build list detail content wrapper (`components/lists/list-detail-content.tsx`)
- [x] Exclude `supabase/functions` from tsconfig (Deno imports)
- [x] Deploy Edge Function to Supabase
- [x] Set Edge Function secrets (GEMINI_API_KEY, FIRECRAWL_API_KEY)
- [x] Set up Database Webhook (products INSERT → ingest-product)
- [x] Configure `next.config.ts` `images.remotePatterns` — allows all HTTPS domains
- [ ] Test: paste URL → skeleton card → extraction → populated card
- [ ] Test: failed extraction shows error with retry button
- [ ] Test: Realtime updates when another user adds a product

---

## Step 1: Product Server Actions

File: `lib/actions/products.ts`

### `addProduct`
From `07-api-contracts.md`:
```
1. Auth check
2. addProductSchema.safeParse(input) → validate URL
3. Verify user is editor+ on the list
4. Extract domain from URL (using extractDomain utility)
5. Insert product row: extraction_status='pending', url, domain, list_id, added_by
6. revalidatePath(`/lists/${listId}`)
7. Return { success: true, data: { id, extraction_status: 'pending' } }
```

The DB webhook fires automatically on INSERT → triggers Edge Function.

### `archiveProduct`
```
1. Auth + validate + verify editor+
2. Set archived_at = now()
3. Revalidate
```

### `retryExtraction`
```
1. Auth + validate + verify editor+
2. Verify current extraction_status is 'failed'
3. Reset extraction_status = 'pending', clear extraction_error
4. DB webhook fires again → Edge Function re-processes
5. If raw_scraped_data exists, Edge Function skips scraping
```

## Step 2: Supabase Edge Function — `ingest-product`

File: `supabase/functions/ingest-product/index.ts`

This is the core backend pipeline from `03-backend-architecture.md`.

### Setup
```bash
npx supabase functions new ingest-product
```

This creates `supabase/functions/ingest-product/index.ts` with the Deno boilerplate.

### Implementation Flow
```
1. Receive webhook payload: { record: { id, url, domain, list_id } }
2. Create Supabase client (service_role — auto-injected in Edge Functions)
3. Fetch the product row (url, domain, raw_scraped_data)
4. Fetch list metadata (category, priorities) for prompt context
5. Fetch adding user's profile.context for prompt context
6. Update extraction_status → 'processing'
7. IF raw_scraped_data is null (first run):
   a. Call Firecrawl API to scrape the URL → get markdown content
   b. Store response in raw_scraped_data
   ELSE (retry — raw data already exists):
   a. Use existing raw_scraped_data
8. Build Gemini extraction prompt (see Step 3)
9. Call Gemini Flash API with structured output mode
10. Parse response JSON
11. Update product row with all extracted fields:
    title, brand, model, image_url, price_min, price_max, currency,
    price_note, specs, pros, cons, rating, review_count, scraped_reviews,
    ai_summary, ai_review_summary, ai_verdict, ai_extracted_at
12. Set extraction_status → 'completed'
13. On ANY error:
    Set extraction_status → 'failed', extraction_error → error message
```

### Firecrawl API Call
```typescript
const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${Deno.env.get('FIRECRAWL_API_KEY')}`,
  },
  body: JSON.stringify({
    url: productUrl,
    formats: ['markdown'],
  }),
})
```

### Gemini API Call
```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: extractionSchema, // JSON schema for structured output
      },
    }),
  }
)
```

### Edge Function Environment Variables (Manual)

Set these in Supabase dashboard:
1. Go to **Settings > Edge Functions**
2. Add secrets:
   - `GEMINI_API_KEY` — same as your `.env.local` value
   - `FIRECRAWL_API_KEY` — same as your `.env.local` value

Or via CLI:
```bash
npx supabase secrets set GEMINI_API_KEY=AIza...
npx supabase secrets set FIRECRAWL_API_KEY=fc-...
```

### Deploy Edge Function
```bash
npx supabase functions deploy ingest-product
```

### Set Up Database Webhook (Manual)

> This was deferred from Phase 2 — the Edge Function must exist before the webhook can target it.

1. In Supabase dashboard, go to **Database > Webhooks**
2. Click **"Create a new webhook"**
3. Configure:
   - **Name:** `product-ingestion-trigger`
   - **Table:** `products`
   - **Events:** `INSERT` only
   - **Type:** Select "Supabase Edge Functions"
   - **Edge Function:** `ingest-product`
   - **Filter:** Add condition `extraction_status=eq.pending` if the UI supports it. Otherwise, the Edge Function checks this itself.
4. Click **"Create webhook"**
5. **Verify:** Insert a test product row in the Supabase Table Editor with `extraction_status='pending'` and check Edge Function logs to confirm it fires.

## Step 3: Gemini Extraction Prompt

File: `lib/ai/prompts.ts`

From `03-backend-architecture.md` — Gemini Extraction Prompt section.

```typescript
export function buildExtractionPrompt(params: {
  scrapedContent: string
  productUrl: string
  listCategory?: string
  listPriorities?: string[]
  userContext?: Record<string, unknown>
}): string {
  return `
Extract structured product data from the following scraped page content.

URL: ${params.productUrl}
${params.listCategory ? `Category hint: ${params.listCategory}` : ''}
${params.listPriorities?.length ? `User priorities (weight these in pros/cons): ${params.listPriorities.join(', ')}` : ''}
${params.userContext ? `User context: ${JSON.stringify(params.userContext)}` : ''}

Return JSON matching this exact schema:
{
  "title": "string",
  "brand": "string or null",
  "model": "string or null",
  "image_url": "string or null",
  "price_min": number or null,
  "price_max": number or null,
  "currency": "string (ISO 4217)",
  "price_note": "string or null",
  "specs": { "key": "value" },
  "pros": ["string"],
  "cons": ["string"],
  "rating": number or null (0-5 scale),
  "review_count": number or null,
  "scraped_reviews": [{"snippet": "string", "rating": number, "source": "string"}],
  "ai_summary": "one paragraph overview",
  "ai_review_summary": "synthesis of customer reviews",
  "ai_verdict": "short verdict (max 10 words)"
}

Rules:
- If a field cannot be found, use null (not empty string)
- Price should be numeric (no currency symbols)
- Specs should focus on the most decision-relevant attributes
- Pros/cons should be 3-5 items each
- ai_summary should be factual and concise
- ai_verdict should be opinionated and memorable

Scraped content:
${params.scrapedContent}
`
}
```

Also create a JSON schema for Gemini's structured output mode — this ensures the response matches the expected shape.

## Step 4: Add Product Form

File: `components/products/add-product-form.tsx` — `'use client'`

From `04-frontend-architecture.md` interaction patterns — URL Paste flow:

```
- Input field: placeholder "Paste a product URL..."
- Submit button (or Enter key)
- On submit: call addProduct Server Action
- Optimistic: immediately add a skeleton card to the grid
- Toast: "Product added — extracting data..."
```

## Step 5: Product Card

File: `components/products/product-card.tsx`

From `04-frontend-architecture.md` component architecture:

### Composition Pattern
```tsx
<ProductCard>
  <ProductCard.Image src={...} />
  <ProductCard.Title>{title}</ProductCard.Title>
  <ProductCard.Price min={29999} max={null} currency="INR" />
  <ProductCard.Actions>
    <ShortlistButton ... />
  </ProductCard.Actions>
</ProductCard>
```

### Elements
- Product image (with fallback for null `image_url`)
- Title (truncated to 2 lines)
- Price display (uses `formatPriceRange` utility)
- Domain badge ("amazon.in" with favicon)
- AI verdict badge
- Shortlist button (Phase 7)
- Status indicator (extraction progress)

### States
1. **Pending/Processing:** Show skeleton with shimmer + extraction status text
2. **Completed:** Full card with all data
3. **Failed:** Error state with retry button

## Step 6: Product Card Skeleton

File: `components/products/product-card-skeleton.tsx`

From `04-frontend-architecture.md` — matches real card dimensions exactly:
```tsx
<div className="rounded-lg border p-4">
  <Skeleton className="h-40 w-full rounded-md" />
  <Skeleton className="mt-3 h-5 w-3/4" />
  <Skeleton className="mt-2 h-4 w-1/4" />
  <Skeleton className="mt-2 h-4 w-1/2" />
</div>
```

## Step 7: Product Grid

File: `components/products/product-grid.tsx`

Responsive grid from `04-frontend-architecture.md`:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {products.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>
```

## Step 8: Extraction Progress Indicator

File: `components/products/extraction-progress.tsx` — `'use client'`

Animated status indicator shown on product cards during extraction:
- **Pending:** Amber pulse dot + "Waiting to extract..."
- **Processing:** Spinning loader + "Extracting data..."
- **Failed:** Red dot + error message + "Retry" button

## Step 9: Realtime Hook

File: `hooks/use-realtime-products.ts` — `'use client'`

From `03-backend-architecture.md` and `07-api-contracts.md`:

```typescript
export function useRealtimeProducts(listId: string) {
  // 1. Create browser Supabase client
  // 2. Subscribe to postgres_changes on products table
  //    filter: list_id=eq.${listId}
  //    events: INSERT, UPDATE, DELETE
  // 3. On change: update local state / trigger revalidation
  // 4. Cleanup: unsubscribe on unmount
}
```

This powers:
- Extraction progress updates (pending → processing → completed)
- Collaborative updates (another user adds/modifies a product)

## Step 10: List Detail Page

File: `app/(app)/lists/[listId]/page.tsx` — Server Component

From `06-pages.md` → `06a-page-list-detail.md`:

### Data Fetching
```typescript
// Fetch list with member count
const { data: list } = await supabase
  .from('lists')
  .select('*, list_members(count)')
  .eq('id', listId)
  .single()

// Fetch products (non-archived)
const { data: products } = await supabase
  .from('products')
  .select('*')
  .eq('list_id', listId)
  .is('archived_at', null)
  .order('position', { ascending: true })

// Fetch user's role in this list
const { data: membership } = await supabase
  .from('list_members')
  .select('role')
  .eq('list_id', listId)
  .eq('user_id', user.id)
  .single()
```

### Layout
```
<ListHeader list={list} membership={membership} />
<AddProductForm listId={listId} />
<ListFilters />   {/* All | Shortlisted | Purchased */}
<ProductGrid products={products} listId={listId} />
{/* Expert Opinion CTA — Phase 9 */}
```

## Step 11: List Header

File: `components/lists/list-header.tsx`

```
- Back button (← to dashboard)
- List name (with ✨ if AI-generated)
- Budget display: "₹30K – ₹50K"
- Deadline display: "Due: Mar 30"
- Member count: 👥 3
- Settings gear icon → navigates to settings page
- Share button → opens invite dialog (Phase 8)
```

## Step 12: List Filters

File: `components/lists/list-filters.tsx` — `'use client'`

Tab-style filter bar using `nuqs` for URL state:

```
[All (6)] [Shortlisted (3)] [Purchased (1)]
```

Plus view toggle: `[Grid] [Table]`

## Test Checkpoint

1. **URL ingestion end-to-end:**
   - Go to a list page
   - Paste a product URL (e.g., an Amazon product link)
   - Skeleton card appears immediately
   - After 10-30 seconds, card populates with real data (title, price, image, verdict)
2. **Failed extraction:**
   - Paste an invalid or blocked URL
   - Card shows "failed" state with error message
   - Click "Retry" → card goes back to "pending"
3. **Realtime:**
   - Open the same list in two browser tabs
   - Add a product in one tab → card appears in the other tab
4. **Filters:**
   - With multiple products, filter tabs show correct counts
5. **Edge Function logs:**
   - Check Supabase dashboard > Edge Functions > Logs for the `ingest-product` function
   - Verify successful extraction logs
