# Phase 9: AI Features

## Checklist

- [x] Build Server Action: `generateHypeTitle` + `regenerateAiComment` (`lib/actions/ai.ts`)
- [x] Build AI hype title prompt — returns JSON with `{ title, emoji }` (`lib/ai/prompts.ts`)
- [x] Wire AI title generation into Create List dialog — debounced 300ms, auto-fills name + emoji
- [x] Build AI comment bubble generation logic — `regenerateAiComment` with fallback pool
- [x] Build AI comment prompt template (`lib/ai/prompts.ts`)
- [x] AI comment displayed on list cards + list header (already wired from Phase 5)
- [x] Build Expert Opinion API route (`app/api/lists/[listId]/expert-opinion/route.ts`) — uses admin client for upsert
- [x] Build Expert Opinion prompt template (`lib/ai/prompts.ts`)
- [x] Build Expert Opinion card (`components/ai/expert-opinion-card.tsx`) — top pick, value pick, comparison, verdict
- [x] Build Expert Opinion CTA + staleness banner (`components/ai/expert-opinion-cta.tsx`)
- [x] Add `category_emoji` to createListSchema and createList action
- [ ] Build AI verdict badge (using inline Badge in product card for now)
- [ ] Build AI summary section (using product detail sheet accordion for now)
- [ ] Wire Expert Opinion into list detail page
- [ ] Wire `regenerateAiComment` calls into product mutation actions
- [ ] Test: creating a list generates a hype title
- [ ] Test: adding/removing products regenerates AI comment
- [ ] Test: Expert Opinion generates with 2+ products
- [ ] Test: Expert Opinion shows staleness when products change
- [ ] Test: AI failures fall back gracefully (no broken UI)

---

## Step 1: AI Hype Title Generation

### Server Action
File: `lib/actions/ai.ts`

```typescript
// generateHypeTitle(input)
// 1. Auth check
// 2. generateHypeTitleSchema.safeParse(input)
// 3. Call Gemini Flash with hype title prompt
// 4. Return { success: true, data: { title } }
// 5. On AI failure: return { success: false, error: { code: 'AI_ERROR' } }
//    Client falls back to manual name entry
```

### Prompt Template
File: `lib/ai/prompts.ts` (add to existing)

From `06-pages.md` — AI Hype Titles section:

```typescript
export function buildHypeTitlePrompt(category: string): string {
  return `
Generate a short, fun, slightly dramatic title for a purchase research list.
Category: ${category}
Requirements:
- Max 30 characters
- Memorable and slightly playful
- Don't use generic phrases like "Ultimate Guide"
- One title only, no quotes
Examples:
  "TV" → "The Great TV Showdown"
  "running shoes" → "Sole Search 2026"
  "coffee machine" → "Espresso Yourself"
  "sofa" → "Operation: Dream Couch"
  "air conditioner" → "The Big Chill"
`
}
```

### Gemini API Call Pattern
File: `lib/ai/gemini.ts`

Create a shared Gemini client wrapper:

```typescript
export async function callGemini(prompt: string, options?: {
  maxTokens?: number
  jsonMode?: boolean
  jsonSchema?: Record<string, unknown>
}): Promise<string> {
  // 1. Call Gemini Flash API
  // 2. Parse response
  // 3. Retry once on network/rate limit error (after 1s delay)
  // 4. Throw on content filter or persistent failure
  // 5. Return text or parsed JSON
}
```

### Wire into Create List Dialog

Update `components/lists/create-list-dialog.tsx`:

```
- After 300ms debounce on category input:
  1. Show loading skeleton + "Generating title..."
  2. Call generateHypeTitle Server Action
  3. On success: typewriter-animate the title character by character
  4. Pre-fill the name input with the generated title
  5. On failure: silently skip, user types their own name
```

Typewriter animation: Use a React effect that reveals the title one character at a time at ~20ms intervals, giving a ~400ms total for a 20-character title.

## Step 2: AI Comment Bubble

### Generation Logic

From `06-pages.md` — AI Comment Bubble section.

The AI comment is regenerated when list state changes. Implementation:

```typescript
// lib/actions/ai.ts

export async function regenerateAiComment(listId: string): Promise<void> {
  // 1. Fetch list metadata + product stats
  // 2. Build prompt with current state
  // 3. Call Gemini Flash
  // 4. Update lists.ai_comment in DB
  // 5. On failure: use a random fallback from FALLBACK_AI_COMMENTS
}
```

### Prompt Template
```typescript
export function buildAiCommentPrompt(params: {
  listName: string
  category: string | null
  productCount: number
  shortlistedCount: number
  purchasedCount: number
  budgetMin: number | null
  budgetMax: number | null
  currency: string
}): string {
  return `
Generate a short, positive, slightly funny one-liner comment about this purchase list.
List: ${params.listName}
Category: ${params.category || 'general'}
Stats: ${params.productCount} products, ${params.shortlistedCount} shortlisted, ${params.purchasedCount} purchased
${params.budgetMin ? `Budget: ${params.budgetMin}-${params.budgetMax} ${params.currency}` : ''}
Requirements:
- Max 60 characters
- Positive and encouraging, slightly witty
- React to the current state (empty, making progress, purchased, over budget, etc.)
- One line only, no quotes, no emoji
`
}
```

### Trigger Points

Call `regenerateAiComment` (debounced 2s) after:
- `addProduct` succeeds
- `archiveProduct` succeeds
- `toggleShortlist` succeeds
- `markPurchased` succeeds

Implementation: call it from within the relevant Server Actions after the main mutation succeeds. Use a non-blocking pattern — don't await the AI call, let it run in the background. If it fails, the old comment stays.

### Display

Update `components/lists/list-card.tsx` to show `list.ai_comment`:
```tsx
<p className="text-sm text-muted-foreground italic bg-muted/50 rounded-lg px-3 py-2 border-l-2 border-ai-accent/30">
  <span className="text-xs">🤖</span> {list.ai_comment}
</p>
```

## Step 3: Expert Opinion

### API Route
File: `app/api/lists/[listId]/expert-opinion/route.ts`

From `07-api-contracts.md` — the only API route in v1.

```typescript
export async function POST(
  request: Request,
  { params }: { params: { listId: string } }
) {
  // 1. Auth check (via server Supabase client from cookies)
  // 2. Verify user is a member of the list
  // 3. Fetch all non-archived products with extraction_status='completed'
  // 4. Require at least 2 products → 422 if fewer
  // 5. Fetch list metadata (budget, priorities, category)
  // 6. Fetch requesting user's profile.context
  // 7. Build Expert Opinion prompt
  // 8. Call Gemini (Flash or Pro — configurable)
  // 9. Parse structured JSON response
  // 10. Upsert into list_ai_opinions (using admin client — bypasses RLS)
  // 11. revalidatePath(`/lists/${listId}`)
  // 12. Return 200 with the opinion data
  // On error: return appropriate HTTP status + ActionResult error
}
```

### Expert Opinion Prompt
File: `lib/ai/prompts.ts` (add to existing)

From `03-backend-architecture.md`:

```typescript
export function buildExpertOpinionPrompt(params: {
  products: Product[]
  budgetMin: number | null
  budgetMax: number | null
  purchaseBy: string | null
  category: string | null
  priorities: string[]
  userContext: Record<string, unknown>
}): string {
  // Include all product data
  // Include budget constraints
  // Include user priorities (weighted)
  // Include user context (room size, city, etc.)
  // Ask for structured JSON output:
  //   top_pick, top_pick_reason, value_pick, value_pick_reason,
  //   summary, comparison, concerns, verdict
}
```

### Expert Opinion Card

File: `components/ai/expert-opinion-card.tsx`

From `06a-page-list-detail.md` — AI Expert Opinion panel.

Displays the structured opinion in sections:

```
🤖 Expert Opinion
Generated from 4 products · 2 hours ago

┌ Top Pick ──────────────────────────────┐
│ 🏆 LG C3 55" OLED                     │
│ Best combination of picture quality    │
│ and price for your 12x14 room...       │
└────────────────────────────────────────┘

┌ Value Pick ────────────────────────────┐
│ 💰 TCL C745 55"                        │
│ At ₹28,999, this delivers 90% of the  │
│ performance at half the price...       │
└────────────────────────────────────────┘

Summary
Based on your 4 options, the LG C3 stands out...

Comparison
[Detailed prose comparing all products...]

⚠ Concerns
The Samsung lacks Dolby Vision support, which...

Verdict
Go with the LG C3 if budget allows...
```

- Top Pick and Value Pick show the referenced product's title (FK lookup)
- Each section is a separate card/block for visual clarity
- "Top Pick" badge appears on the referenced product card in the grid

### Expert Opinion CTA

File: `components/ai/expert-opinion-cta.tsx` — `'use client'`

```
Two states:

1. No opinion yet:
   [🤖 Get Expert Opinion] button

2. Opinion exists but stale (product_count mismatch):
   "Expert opinion may be outdated — products have changed"
   [Regenerate] button

3. Opinion exists and fresh:
   Don't show CTA — opinion card is inline on the page
```

Loading state: animated AI indicator while Gemini generates (3-10s).

### AI Verdict Badge

File: `components/ai/ai-verdict-badge.tsx`

Small badge on product cards showing `product.ai_verdict`:
```
"Best value under ₹30K"
```
Purple-tinted badge with `--ai-accent` styling.

### AI Summary Section

File: `components/ai/ai-summary-section.tsx`

Renders `product.ai_summary` in the product detail sheet. Subtle AI styling with `--ai-accent` left border.

## Step 4: Wire AI Features into Existing Components

### Dashboard (list cards)
- Show `list.ai_comment` on each card
- Show `✨` next to title if `!list.ai_title_edited`

### List Detail Page
- Show Expert Opinion card (if exists) below the product grid
- Show Expert Opinion CTA (if no opinion or stale)

### Product Cards
- Show `product.ai_verdict` badge
- Show "Top Pick" / "Value Pick" badge if this product is referenced in the expert opinion

### Product Detail Sheet
- AI Summary section (first accordion, open by default)
- AI Review Summary in the Reviews section

## Test Checkpoint

1. **Hype title:**
   - Create a list with category "TV"
   - AI generates a title like "The Great TV Showdown"
   - Title appears with typewriter animation
   - Edit the title → `✨` indicator disappears
2. **AI comment:**
   - After adding 3 products → comment regenerates (e.g., "Three contenders enter...")
   - After shortlisting one → comment updates
   - If Gemini fails → fallback static comment shows
3. **Expert Opinion:**
   - Add 2+ products with completed extraction
   - Click "Get Expert Opinion"
   - Loading state shows for 3-10s
   - Opinion card renders with top pick, value pick, comparison, verdict
   - Top Pick product card shows a badge in the grid
4. **Staleness:**
   - Generate an opinion → add another product → banner shows "Opinion may be outdated"
   - Click "Regenerate" → new opinion generated with updated product count
5. **Error handling:**
   - If Gemini is down/rate-limited:
     - Hype title: dialog falls back to empty name field
     - AI comment: old comment stays, no crash
     - Expert Opinion: error toast "Failed to generate opinion — try again"
6. **With 1 product:**
   - Expert Opinion CTA button is disabled with tooltip "Need at least 2 products"
