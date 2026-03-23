# Phase 7: Product Detail & Interactions

## Checklist

- [x] Build Server Actions: `toggleShortlist`, `markPurchased` (in `lib/actions/products.ts`, built in Phase 6)
- [ ] Write tests for shortlist/purchase actions
- [x] Build product detail sheet (`components/products/product-detail-sheet.tsx`) — right sheet desktop, accordion sections
- [x] Build product specs table (`components/products/product-specs.tsx`) — renders JSONB keys as Title Case
- [x] Build product reviews section (`components/products/product-reviews.tsx`) — AI summary + scraped excerpts with stars
- [x] Build product pros/cons list (`components/products/product-pros-cons.tsx`) — green checks, red X marks
- [x] Build product actions bar (`components/products/product-actions.tsx`) — shortlist/purchased toggles + archive with confirmation
- [x] Build price display component (`components/common/price-display.tsx`) — built in Phase 6
- [x] Build domain badge component (`components/common/domain-badge.tsx`) — built in Phase 6
- [x] Wire product card click → opens detail sheet (via list-detail-content state)
- [x] Detail sheet syncs with Realtime (selected product refreshes from latest data)
- [ ] Build optimistic action hook (`hooks/use-optimistic-action.ts`) — deferred, using useTransition for now
- [ ] Build separate shortlist button with animation — deferred, using action bar for now
- [ ] Build product status badge — using inline Badge in product card for now
- [ ] Test: shortlist toggle works
- [ ] Test: mark purchased sets purchased_at
- [ ] Test: detail sheet shows all product data sections
- [ ] Test: product-to-product navigation in sheet

---

## Step 1: Shortlist & Purchase Server Actions

File: `lib/actions/products.ts` (add to existing file)

### `toggleShortlist`
From `07-api-contracts.md`:
```
1. Auth check
2. toggleShortlistSchema.safeParse(input)
3. Verify editor+ on the product's list
4. Update is_shortlisted on the product row
5. revalidatePath(`/lists/${listId}`)
6. Return { success: true, data: { id, isShortlisted } }
```

### `markPurchased`
```
1. Auth check
2. markPurchasedSchema.safeParse(input)
3. Verify editor+ on the product's list
4. If isPurchased=true: set purchased_at=now(), optional purchasedPrice and purchaseUrl
5. If isPurchased=false: clear purchased_at, purchased_price, purchase_url
6. revalidatePath(`/lists/${listId}`)
7. Return { success: true, data: { id, isPurchased } }
```

## Step 2: Optimistic Action Hook

File: `hooks/use-optimistic-action.ts` — `'use client'`

Generic hook for optimistic mutations:

```typescript
export function useOptimisticAction<T>(
  action: (input: unknown) => Promise<ActionResult<T>>,
  options: {
    onSuccess?: (data: T) => void
    onError?: (error: ActionError) => void
  }
) {
  // Uses useTransition + useOptimistic
  // Returns { execute, isPending }
  // On execute: applies optimistic update immediately
  // On success: revalidation replaces optimistic data
  // On failure: reverts optimistic update + calls onError
}
```

## Step 3: Shortlist Button

File: `components/products/shortlist-button.tsx` — `'use client'`

From `04-frontend-architecture.md` — Shortlisting interaction:

```
1. User taps star/heart icon
2. Optimistic update: icon fills immediately with scale animation
3. Server Action fires in background
4. If fails: revert icon, show error toast
5. Other collaborators see change via Realtime
```

Animation: CSS `transform: scale(1.2)` for 200ms with spring easing on toggle.

## Step 4: Product Detail Sheet

File: `components/products/product-detail-sheet.tsx` — `'use client'`

From `06b-product-detail-sheet.md`. This is a complex component — read the full spec.

### Desktop: Right sheet (`<Sheet side="right">`)
### Mobile: Bottom sheet (`<Sheet side="bottom">`)

### Layout (Accordion Sections)
```
┌─────────────────────────────────┐
│ [← Back]  Product Title   [✕]  │
│ amazon.in · Added 2 days ago    │
│─────────────────────────────────│
│ [Product Image - large]         │
│                                 │
│ ₹29,999         ★ 4.3 (1,247)  │
│ "Best value under ₹30K"  — AI  │
│                                 │
│ [★ Shortlist] [✓ Purchased] [🗑]│
│─────────────────────────────────│
│ ▼ AI Summary                    │
│   One paragraph overview...     │
│                                 │
│ ▶ Specs (8 items)               │
│ ▶ Pros & Cons                   │
│ ▶ Reviews (5 excerpts)          │
│─────────────────────────────────│
│ Comments (3)                    │
│ ...comment thread...            │
│ [Type a comment...]             │
└─────────────────────────────────┘
```

### Accordion Sections (using shadcn Collapsible or custom accordion)

1. **AI Summary** — `product.ai_summary`, open by default
2. **Specs** — render `product.specs` JSONB as a key-value table
3. **Pros & Cons** — two columns with green checkmarks and red X marks
4. **Reviews** — `product.scraped_reviews` array + `product.ai_review_summary`

### States
- **Completed:** Full content in all sections
- **Processing:** Skeleton placeholders in each section + extraction progress indicator
- **Failed:** Error message with retry button

### Product-to-Product Navigation
- Left/right arrows or keyboard (← →) to navigate between products in the list
- Sheet content crossfades to the next product

## Step 5: Product Specs Table

File: `components/products/product-specs.tsx`

Renders `product.specs` (JSONB) as a clean two-column table:

```
Screen Size      65"
Resolution       4K (3840x2160)
Panel Type       OLED
Refresh Rate     120Hz
HDMI Ports       4 (HDMI 2.1)
```

Keys are transformed from snake_case to Title Case for display.

## Step 6: Product Reviews Section

File: `components/products/product-reviews.tsx`

```
AI Review Summary (product.ai_review_summary)
────────────────
Reviewer Excerpts:
★★★★★ "Best TV I've bought..." — Amazon.in
★★★☆☆ "Decent for the price but..." — Amazon.in
```

Renders `product.scraped_reviews` array with star ratings and source attribution.

## Step 7: Product Pros & Cons

File: `components/products/product-pros-cons.tsx`

Two-column layout:
```
Pros                              Cons
✓ Infinite contrast ratio         ✗ Risk of burn-in
✓ Excellent gaming support        ✗ Brightness lower than QLED
✓ Dolby Vision + Atmos            ✗ No HDR10+ support
```

Uses green checkmarks for pros, red X for cons.

## Step 8: Supporting Components

### Price Display
File: `components/common/price-display.tsx`

Renders price range intelligently:
- Single price: `₹29,999`
- Range: `₹29,999 – ₹34,999`
- With note: `₹29,999 · Sale ends Apr 1`
- Null: `Price not available`

### Domain Badge
File: `components/common/domain-badge.tsx`

Shows domain with a small favicon:
```
🌐 amazon.in
```

### Product Status Badge
File: `components/products/product-status-badge.tsx`

Badge component showing product state:
- Shortlisted: amber badge with star icon
- Purchased: green badge with check icon
- Processing: amber animated badge
- Failed: red badge with alert icon

### Product Actions Bar
File: `components/products/product-actions.tsx` — `'use client'`

Row of action buttons for the detail sheet:
- Shortlist toggle (star/heart)
- Mark Purchased toggle (checkmark)
- Archive/Delete (trash icon with confirmation dialog)

## Step 9: Wire Product Card → Detail Sheet

Update `components/products/product-card.tsx`:

```
- Click on a product card opens the detail sheet
- Pass product data to the sheet
- Sheet manages its own open/close state
- URL updates to include product ID: ?product=uuid (via nuqs)
  So the detail sheet is deep-linkable
```

## Test Checkpoint

1. **Shortlist toggle:**
   - Click shortlist on a card → icon fills immediately (optimistic)
   - Refresh page → product is still shortlisted (persisted)
   - Filter "Shortlisted" → only shortlisted products show
2. **Mark purchased:**
   - Open detail sheet → click "Mark Purchased"
   - Product shows green "Purchased" badge
   - `purchased_at` is set in database
3. **Detail sheet:**
   - Click a product card → sheet slides in from right (desktop) / bottom (mobile)
   - All sections visible: AI summary, specs, pros/cons, reviews
   - Escape or click outside closes sheet
4. **Product navigation:**
   - With sheet open, click another product card → sheet updates
   - Arrow keys navigate between products
5. **Extraction states:**
   - Add a new product → sheet shows extraction progress
   - When extraction completes → sheet content populates in real-time
6. **Failed product:**
   - Product with failed extraction shows error + retry button in sheet
