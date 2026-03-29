# Phase 4: Core Components

## Goal

Build all the UI components for the Spec Explainer view — desktop tables, mobile cards, dot rating, empty states, and the top-level view component that orchestrates them.

**Depends on:** Phase 1 (types), Phase 3 (view toggle wired up)

---

## Tasks

### 4.1 Dot Rating Component

**File:** `components/specs/dot-rating.tsx` (new)

Small, reusable component for 1-5 dot ratings.

```typescript
type DotRatingProps = {
  score: number  // 1-5
  max?: number   // default 5
  className?: string
}
```

Renders: `●●●●○` for score=4. Filled dots use `text-foreground`, empty dots use `text-muted-foreground/30`. Each dot is a `w-2 h-2` circle. Accessible: `role="img"` + `aria-label="4 out of 5"`.

**Tests:**

- Renders correct number of filled/empty dots for each score 1-5
- Handles edge case: score 0 → all empty
- Has correct aria-label

### 4.2 Spec Comparison Table (Desktop)

**File:** `components/specs/spec-comparison-table.tsx` (new)

shadcn `<Table>` with:

- **Header row:** First cell "Spec", then one column per product (product title, truncated)
- **Spec rows:** For each spec in `spec_comparison`:
  - Main row: spec label in first cell, product values in subsequent cells
  - Value lookup: `product.specs[spec.product_spec_keys[product.id]]` — reads from product data, not from the analysis
  - Best badge: `✓` in emerald if `spec.best_product_ids.includes(product.id)`
  - Missing key (product not in `product_spec_keys`) → render "—"
  - Sub-row (full `colspan`): explanation in `text-sm text-muted-foreground italic`
- **Sticky first column:** Spec names stay visible when scrolling horizontally (for >3 products)

Props:

```typescript
type SpecComparisonTableProps = {
  specs: SpecComparisonRow[]
  products: Product[]  // for column headers (title, brand) AND for specs value lookup
}
```

**Tests:**

- Renders correct number of rows
- Values read from `product.specs` via `product_spec_keys` mapping
- Best-in-spec cells show checkmark badge
- Explanation rows render below each spec
- Handles ties (multiple best picks in same row)
- Product missing from `product_spec_keys` → renders "—"
- Product in mapping but key not in `product.specs` → renders "—"

### 4.3 Spec Comparison Cards (Mobile)

**File:** `components/specs/spec-comparison-cards.tsx` (new)

Stacked card layout for mobile. Each spec is a `<Card>`:

- **Header:** Spec label (`font-medium`)
- **Body:** Explanation (`text-sm text-muted-foreground`)
- **Best pick:** Trophy icon + best product name(s) + their value (looked up from `product.specs` via `product_spec_keys`)
- **Expandable:** `<Collapsible>` "Show all values" → reveals every product's value (from `product.specs`)

Props: same as desktop table.

**Tests:**

- Renders one card per spec
- Best pick section shows correct product(s)
- Collapsible starts closed
- Expanding reveals all product values

### 4.4 Dimension Table (Desktop)

**File:** `components/specs/dimension-table.tsx` (new)

shadcn `<Table>` with:

- **Header row:** "Dimension", then one column per product
- **Dimension rows:** For each dimension:
  - Cell content: `<DotRating>` + `"4/5"` + reasoning in `text-xs text-muted-foreground`
  - `uses_external_knowledge` → small `🌐` globe icon with tooltip

Props:

```typescript
type DimensionTableProps = {
  dimensions: Dimension[]
  products: Product[]
}
```

**Tests:**

- Renders correct number of rows
- Dot ratings match scores
- External knowledge indicator shows when `uses_external_knowledge: true`
- Tooltip text is accessible

### 4.5 Dimension Cards (Mobile)

**File:** `components/specs/dimension-cards.tsx` (new)

Stacked cards. Each dimension is a `<Card>`:

- **Header:** Dimension name
- **Description:** `text-sm text-muted-foreground`
- **Ratings:** Compact rows per product: product name + `<DotRating>` + score
- External knowledge globe icon inline

**Tests:**

- Renders one card per dimension
- All product ratings visible (no collapsing needed — compact enough)

### 4.6 Staleness Alert

**File:** `components/specs/spec-staleness-alert.tsx` (new)

Amber alert banner shown when spec analysis is stale:

```typescript
type SpecStalenessAlertProps = {
  addedCount: number    // products added since generation
  removedCount: number  // products removed since generation
  onRegenerate: () => void
  isRegenerating: boolean
}
```

Text: "N products added since last analysis" or "N products changed since last analysis" depending on the delta. `[Regenerate]` button that triggers the API call.

**Tests:**

- Shows correct count text
- Regenerate button calls handler
- Button shows loading state when regenerating

### 4.7 Empty States

**File:** `components/specs/spec-empty-state.tsx` (new)

Two variants:

1. **`variant="generate"`** — ≥2 products, no analysis yet. Shows "Generate Spec Analysis" button.
2. **`variant="not-enough"`** — <2 completed products. Shows "Add at least 2 products" message with URL input.

**Tests:**

- Generate variant shows button, clicking triggers handler
- Not-enough variant shows correct message
- Button disabled state during generation

### 4.8 Legend Footer

**File:** `components/specs/spec-legend.tsx` (new)

Simple footer: `✓ = best in spec · 🌐 = uses external knowledge · Generated {date} via {model}`

### 4.9 Top-Level View Component

**File:** `components/specs/spec-explainer-view.tsx` (new)

Orchestrates everything:

```typescript
type SpecExplainerViewProps = {
  specAnalysis: ListSpecAnalysis | null
  products: Product[]
  list: List
  isStale: boolean
}
```

Logic:

- No analysis + <2 products → `<SpecEmptyState variant="not-enough">`
- No analysis + ≥2 products → `<SpecEmptyState variant="generate">`
- Has analysis + stale → `<SpecStalenessAlert>` above content
- Has analysis → `<SpecComparisonSection>` + `<DimensionSection>` + `<SpecLegend>`
- Responsive: uses `useMediaQuery` or Tailwind `hidden`/`block` to toggle between table (desktop) and cards (mobile)

Handles the generate/regenerate API call:

```typescript
const [isGenerating, setIsGenerating] = useState(false)

async function handleGenerate() {
  setIsGenerating(true)
  const res = await fetch(`/api/lists/${list.id}/spec-analysis`, { method: "POST" })
  // ... handle response, toast on success/error
  setIsGenerating(false)
  router.refresh()
}
```

---

## Acceptance Criteria

- [ ] All components render correctly with mock data
- [ ] Desktop shows tables, mobile shows cards (responsive breakpoint at 640px)
- [ ] Dot rating is accessible and visually correct for all scores
- [ ] Best-in-spec badges highlight correctly, including ties
- [ ] External knowledge indicator shows with tooltip
- [ ] Staleness alert shows correct change count and regenerate works
- [ ] Empty states show appropriate variant
- [ ] Generate/regenerate triggers API call with loading state
- [ ] All tests pass
