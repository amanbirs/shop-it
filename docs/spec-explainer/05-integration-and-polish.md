# Phase 5: Integration & Polish

## Goal

Wire everything together: fetch spec analysis in the page server component, connect staleness detection, integrate with Expert Opinion, add animations, and verify accessibility.

**Depends on:** Phase 2 (API route), Phase 4 (components)

---

## Tasks

### 5.1 Page Data Fetch

**File:** `app/(app)/lists/[listId]/page.tsx` (modify)

Add `list_spec_analyses` to the parallel data fetch that already loads products, list metadata, AI opinion, etc.

```typescript
const [list, membership, members, products, aiOpinion, specAnalysis, contextQuestions, suggestions] =
  await Promise.all([
    // ... existing fetches ...
    supabase.from("list_spec_analyses").select("*").eq("list_id", listId).maybeSingle(),
    // ... existing fetches ...
  ])
```

Compute staleness in the server component and pass it down:

```typescript
const completedProductIds = products
  .filter(p => p.extraction_status === "completed" && !p.archived_at)
  .map(p => p.id)
  .sort()

const analysisProductIds = (specAnalysis?.product_ids ?? []).sort()

const isSpecAnalysisStale = specAnalysis
  ? !arraysEqual(completedProductIds, analysisProductIds)
  : false
```

Pass to `<ListDetailContent>`:

```typescript
<ListDetailContent
  // ... existing props
  specAnalysis={specAnalysis}
  isSpecAnalysisStale={isSpecAnalysisStale}
/>
```

### 5.2 Expert Opinion Integration

**File:** `lib/ai/prompts.ts` (modify `buildExpertOpinionPrompt`)

Accept optional `specAnalysis: ListSpecAnalysis | null` parameter. When present, append to the prompt:

```
## Pre-computed Dimension Ratings
The following quality dimensions have already been evaluated for this product set.
Use these as a foundation — you may adjust if you disagree, but explain why.

{for each dimension:}
{dimension.name}: {for each rating:} {product.title} = {score}/5 ({reasoning}), ...
```

**File:** `app/api/lists/[listId]/expert-opinion/route.ts` (modify)

Fetch spec analysis before building the prompt:

```typescript
const { data: specAnalysis } = await adminClient
  .from("list_spec_analyses")
  .select("*")
  .eq("list_id", listId)
  .maybeSingle()

const prompt = buildExpertOpinionPrompt(products, list, userContext, specAnalysis)
```

### 5.3 Realtime Subscription (Optional)

**File:** `hooks/use-realtime-products.ts` (modify)

Add a third channel for spec analysis changes so regeneration by one collaborator is reflected for others:

```typescript
const specChannel = supabase
  .channel(`list-specs-${listId}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "list_spec_analyses",
      filter: `list_id=eq.${listId}`,
    },
    () => router.refresh()
  )
  .subscribe()
```

This is lower priority — spec analysis regeneration is manual and less frequent than product changes. Can skip for v1 if needed.

### 5.4 Animations

Wire up Framer Motion animations as specified in the design doc:

**View transition** (in `list-detail-content.tsx`):

```typescript
<AnimatePresence mode="wait">
  {view === "specs" ? (
    <motion.div
      key="specs"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25 }}
    >
      <SpecExplainerView ... />
    </motion.div>
  ) : view === "grid" ? (
    <motion.div key="grid" ...>
      <ProductGrid ... />
    </motion.div>
  ) : (
    <motion.div key="table" ...>
      <ProductTable ... />
    </motion.div>
  )}
</AnimatePresence>
```

**Row stagger** (in spec-comparison-table and dimension-table): Framer Motion `staggerChildren: 0.04` on the `<tbody>`.

**Best badge pop**: `scale 0→1.2→1` spring animation on the `✓` badge.

**Mobile collapsible**: Framer Motion height animation for "Show all values" expand.

### 5.5 Accessibility Audit

Verify all accessibility requirements from the design spec:

- [ ] Tables have proper `<th scope>` attributes
- [ ] Dot ratings have `role="img"` and `aria-label`
- [ ] Best badges have `aria-label`
- [ ] External knowledge icons have tooltip + `aria-label`
- [ ] Staleness alert has `role="alert"`
- [ ] Loading skeleton has `aria-busy="true"`
- [ ] Focus order makes sense (alert → tables → legend)
- [ ] Mobile collapsibles have `aria-expanded`
- [ ] View toggle has `aria-label="View mode"`

### 5.6 Update System Guide

**File:** `docs/system-guide/06a-page-list-detail.md` (modify)

Update the "View Toggle" decision section to reference the third option. Add a note about the Spec Explainer view with a link to `06f-spec-explainer-view.md`.

**File:** `docs/system-guide/02-data-model.md` (modify)

Add `list_spec_analyses` table documentation alongside `list_ai_opinions`.

---

## Tests

### Integration Tests

- Page loads spec analysis in parallel with other data
- Staleness computed correctly: same products → not stale, different → stale
- Expert Opinion prompt includes dimensions when spec analysis exists
- Expert Opinion prompt works normally without spec analysis

### E2E Flow (Manual or Playwright)

1. Create list → add 3 products → wait for extraction
2. Switch to Specs view → see empty state with "Generate" button
3. Click Generate → loading skeleton → tables render
4. Add a 4th product → staleness banner appears
5. Click Regenerate → tables update with new product
6. Switch to grid → switch back to specs → data persists (cached)
7. Open Expert Opinion → verify dimensions are referenced
8. Mobile: verify card layout renders correctly

---

## Acceptance Criteria

- [ ] Spec analysis fetched in page server component
- [ ] Staleness detection works correctly
- [ ] Expert Opinion incorporates dimension ratings
- [ ] Animations are smooth and match spec
- [ ] Accessibility requirements verified
- [ ] System guide docs updated
- [ ] Full E2E flow works end-to-end
- [ ] All tests pass
