# ShopIt — Spec Explainer View (`/lists/[id]?view=specs`)

Design spec for the Spec Explainer — a third view mode on the List Detail page that provides structured spec comparison, plain-English explanations, per-spec best-pick recommendations, and AI-generated dimension ratings for each product.

> **Note:** This view is accessed via the existing view toggle alongside Grid and Table views on the List Detail page.

---

## Overview

The Spec Explainer solves a specific problem: when comparing complex products (speakers, TVs, rugs, headphones), raw spec values like "40mm driver" or "300 thread count" don't help a non-expert make a decision. This view:

1. **Curates** the most important specs from the JSONB `specs` across all products in the list (AI selects what matters for this category)
2. **Explains** each spec in a one-liner ("Higher thread count = denser, softer fabric")
3. **Recommends** which product has the best value for each individual spec
4. **Rates** each product across AI-generated quality dimensions (1-5 scale) tailored to the product category
5. **Feeds** dimension ratings into the Expert Opinion for richer analysis

---

## Decisions Summary

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Spec selection | AI-curated, not union of all keys | Avoids noise. AI picks 6-12 specs that actually differentiate products in this category. |
| 2 | Explanation depth | One-liner per spec | Enough to inform without overwhelming. Tooltip for more detail later if needed. |
| 3 | "Best" meaning | Best for that specific spec | Higher-level value judgments live in Expert Opinion. This view is factual per-spec. |
| 4 | Persistence | Cached in DB, regenerated on product add/remove | Avoids repeated AI calls. Staleness tracked via `product_count`. |
| 5 | Dimension generation | AI-generated per category | "Sound quality" for speakers, "comfort" for sofas — not a fixed universal set. |
| 6 | Rating scale | 1-5 numerical | Simple, familiar, fits in a compact table cell. |
| 7 | External knowledge | Allowed, attributed | Brand reliability, market reputation factor in. AI marks which ratings use external data. |
| 8 | Relationship to Expert Opinion | Feeds into, does not replace | Dimension ratings become structured input to the Expert Opinion prompt. Separate view. |
| 9 | Access point | Third view mode in toggle | `[Grid] [Table] [Specs]` — same toggle, URL `?view=specs`. |
| 10 | Mobile layout | Hide spec values, show explanation + best pick only | Keeps it scannable on small screens. Full table scrolls horizontally as fallback. |

---

## Data Model

### New Table: `list_spec_analyses`

Stores the AI-generated spec comparison and dimension ratings for a list. One row per list (1:1), regenerated when products change.

```sql
create table public.list_spec_analyses (
  id              uuid primary key default gen_random_uuid(),
  list_id         uuid not null unique references public.lists(id) on delete cascade,

  -- AI-curated spec comparison (metadata only — actual values read from product.specs at render time)
  -- Array of { key, label, explanation, best_product_ids, product_spec_keys }
  spec_comparison jsonb not null default '[]',

  -- AI-generated quality dimensions
  -- Array of { name, description, ratings: { product_id, score, reasoning, uses_external_knowledge } }
  dimensions      jsonb not null default '[]',

  -- Staleness tracking
  product_count   integer,           -- how many products when generated
  product_ids     uuid[] default '{}', -- which products were analyzed (detect add/remove)

  -- Generation metadata
  generated_at    timestamptz not null default now(),
  model_version   text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

**Why one table, not two?**

Considered separate `list_spec_comparisons` and `list_dimension_ratings` tables, but:
- They're always generated together in a single AI call
- They share the same staleness lifecycle (both stale when a product changes)
- Keeping them together means one read to populate the entire view
- JSONB is the right fit — the shape of specs and dimensions varies by category

**Why `spec_comparison` stores metadata, not values:**

The actual spec values already live on each product's `specs` JSONB. Duplicating them would create a staleness risk — if a product is re-extracted and a value changes, the spec analysis would show stale data until regenerated. Instead, `spec_comparison` stores only what the AI adds: curation (which specs matter), explanation, best picks, and key mappings. The UI reads values from `product.specs` at render time.

**Why `spec_comparison` is JSONB, not a normalized table:**

The spec comparison has a variable number of rows (6-12 specs depending on category), each with a variable number of product columns. Normalizing this into `spec_rows` + `spec_values` creates 60-120 rows for what's essentially a single cached AI response. JSONB keeps it as one atomic unit that's generated, read, and replaced as a whole.

**Why `product_ids` array in addition to `product_count`:**

`product_count` alone can't distinguish "product A was removed and product B was added" (count stays the same). Storing the actual IDs lets us detect any change — additions, removals, or swaps.

### JSONB Schema: `spec_comparison`

Stores only AI-added metadata. Actual spec values are read from `product.specs[key]` at render time.

```jsonc
[
  {
    "key": "panel_type",              // concept ID (most common key across products)
    "label": "Panel Type",            // human-readable display name
    "explanation": "OLED panels offer perfect blacks and infinite contrast; QLED is brighter in daylight",
    "best_product_ids": ["uuid-sony", "uuid-lg"],  // ties = multiple IDs
    "product_spec_keys": {            // maps product_id → actual key in their specs JSONB
      "uuid-sony": "panel_type",      // product.specs["panel_type"] → "OLED"
      "uuid-samsung": "display_technology",  // different key, same concept
      "uuid-lg": "panel_type"
    }
  },
  {
    "key": "refresh_rate",
    "label": "Refresh Rate",
    "explanation": "Higher refresh rate = smoother motion, especially for sports and gaming",
    "best_product_ids": ["uuid-sony", "uuid-samsung"],
    "product_spec_keys": {
      "uuid-sony": "refresh_rate",
      "uuid-samsung": "refresh_rate",
      "uuid-lg": "refresh_rate"
    }
  }
  // ... 6-12 specs total
]
```

**Render-time value lookup:**

```typescript
// For each spec row, for each product:
const specKey = spec.product_spec_keys[product.id]
const value = specKey ? product.specs[specKey] : null
const isBest = spec.best_product_ids.includes(product.id)
// value === null → render "—"
```

**Why `product_spec_keys` mapping exists:**

Different products may use different spec keys for the same concept (e.g., `panel_type` vs `display_technology`). The extraction AI is consistent within a category but not guaranteed across products scraped at different times or from different sources. The spec analysis AI sees all products' specs and produces the correct key mapping per product. If a product truly lacks a spec, it's simply omitted from the mapping and renders as "—".

### JSONB Schema: `dimensions`

```jsonc
[
  {
    "name": "Picture Quality",
    "description": "Color accuracy, contrast, HDR performance, and viewing angles",
    "ratings": [
      {
        "product_id": "uuid-sony",
        "score": 5,                    // 1-5 scale
        "reasoning": "OLED with Cognitive Processor XR delivers reference-grade color accuracy",
        "uses_external_knowledge": true  // sourced from brand reputation / reviews beyond scraped data
      },
      {
        "product_id": "uuid-samsung",
        "score": 4,
        "reasoning": "Excellent brightness but QLED can't match OLED blacks",
        "uses_external_knowledge": false
      }
    ]
  },
  {
    "name": "Gaming Performance",
    "description": "Input lag, VRR support, and response time for gaming use",
    "ratings": [
      { "product_id": "uuid-sony", "score": 4, "reasoning": "...", "uses_external_knowledge": false },
      { "product_id": "uuid-samsung", "score": 5, "reasoning": "...", "uses_external_knowledge": false }
    ]
  }
  // ... 4-7 dimensions total
]
```

### RLS Policy

Same pattern as `list_ai_opinions` — visible to all members of the list; only system/AI writes.

```sql
-- Read: any member of the list
create policy "Members can view spec analysis"
  on list_spec_analyses for select
  using (
    list_id in (
      select list_id from list_members where user_id = auth.uid()
    )
  );

-- Write: service role only (AI pipeline)
-- No insert/update/delete policies for authenticated users
```

### Index

```sql
-- list_id unique constraint already acts as index
-- No additional indexes needed at family scale
```

### Impact on Expert Opinion

The `list_ai_opinions` table is unchanged. The Expert Opinion generation prompt will be updated to include dimension ratings as structured input when available. The prompt change is in the AI pipeline, not the schema.

---

## AI Generation Pipeline

### Trigger

Spec analysis is generated:
1. **On first visit** to the Specs view when no analysis exists and ≥2 products have `extraction_status = 'completed'`
2. **On product add/remove** — when the set of completed products changes. Not auto-regenerated; a staleness banner prompts the user to regenerate (same pattern as Expert Opinion).

### Why not auto-regenerate?

Auto-regenerating on every product change would:
- Waste AI calls when a user is rapidly adding 5 URLs in a row
- Create a moving target — the analysis changes while you're reading it
- Cost money for each Gemini call

Instead: generate once, show staleness warning, let the user decide when to refresh. Matches the Expert Opinion pattern users already understand.

### API Route

```
POST /api/lists/[listId]/spec-analysis
```

Follows the same pattern as `/api/lists/[listId]/expert-opinion`:

1. **Auth check** — verify user is editor/owner of the list
2. **Product fetch** — get all products with `extraction_status = 'completed'` and `archived_at IS NULL`
3. **Minimum check** — require ≥2 completed products (can't compare one product against itself)
4. **Prompt build** — `buildSpecAnalysisPrompt(products, list)`
5. **Gemini call** — `callGemini(prompt, { jsonMode: true, maxTokens: 8192 })`
6. **Response parse** — validate JSON shape, extract `spec_comparison` and `dimensions`
7. **DB upsert** — write to `list_spec_analyses` using admin client (bypasses RLS)
8. **Revalidate** — `revalidatePath('/lists/{listId}')`

### Prompt Design

```
You are analyzing products for a purchase comparison. Your job is to:

1. SPEC COMPARISON: Select the 6-12 most important specs that differentiate these
   products for a buyer in the "{category}" category. For each spec:
   - Pick a clear label and a snake_case concept key
   - Write a one-sentence explanation of why this spec matters to a buyer
   - List which product_id(s) have the best value for this spec
   - Provide a "product_spec_keys" mapping: for each product, the actual key name
     in that product's specs object that corresponds to this concept. Products may
     use different key names for the same concept (e.g., "panel_type" vs
     "display_technology"). If a product doesn't have this spec, omit it from the map.

2. QUALITY DIMENSIONS: Generate 4-7 evaluation dimensions appropriate for
   "{category}" products. These should cover different angles a buyer cares about
   (e.g., for TVs: picture quality, gaming performance, smart features, build quality,
   value for money). For each dimension:
   - Name and briefly describe what it measures
   - Rate each product 1-5 with a one-sentence justification
   - You may use general product knowledge beyond the provided data (e.g., brand
     reliability, known issues) — if you do, mark `uses_external_knowledge: true`

User's priorities (weight these higher): {priorities}
User's budget: {budget_min}-{budget_max} {currency}
User context: {user_context}

Products:
---
{product_1: id, title, brand, model, price, specs, pros, cons, rating, review_count, ai_summary}
---
{product_2: ...}
---
...

Respond in JSON matching this exact schema:
{
  "spec_comparison": [
    {
      "key": "snake_case_concept_name",
      "label": "Human Readable Name",
      "explanation": "One sentence explaining why this matters to a buyer",
      "best_product_ids": ["uuid-of-best-product", "uuid-if-tied"],
      "product_spec_keys": {
        "product-uuid-1": "actual_key_in_their_specs",
        "product-uuid-2": "possibly_different_key_name"
      }
    }
  ],
  "dimensions": [
    {
      "name": "Dimension Name",
      "description": "What this dimension measures",
      "ratings": [
        {
          "product_id": "uuid",
          "score": 1-5,
          "reasoning": "One sentence justification",
          "uses_external_knowledge": true/false
        }
      ]
    }
  ]
}
```

**Why one AI call, not two?**

Generating specs and dimensions together gives the AI full context for both tasks. Dimensions like "value for money" depend on understanding the specs; spec "best" picks benefit from the holistic view dimensions provide. Splitting would either require two calls (slower, more expensive) or result in disconnected analysis.

**Model choice:** `gemini-3.1-flash-lite-preview` — same as Expert Opinion. Fast enough for interactive use (~2-4s), cheap enough to regenerate without concern. If response quality is insufficient, can upgrade to `gemini-3.1-flash-preview` without schema changes.

### Staleness Detection

On the list detail page (server component), the data fetch compares:
```typescript
const currentProductIds = products
  .filter(p => p.extraction_status === 'completed' && !p.archived_at)
  .map(p => p.id)
  .sort()

const analysisProductIds = specAnalysis?.product_ids?.sort() ?? []

const isStale = !arraysEqual(currentProductIds, analysisProductIds)
```

If stale, the UI shows a warning banner: "2 products added since last analysis — [Regenerate]"

### Integration with Expert Opinion Prompt

When spec analysis exists, the Expert Opinion prompt builder (`buildExpertOpinionPrompt`) appends a structured section:

```
## Pre-computed Dimension Ratings
The following quality dimensions have already been evaluated for this product set.
Use these as a foundation — you may adjust if you disagree, but explain why.

{dimension_name}: {product_title} = {score}/5 ({reasoning}), ...
```

This makes the Expert Opinion more consistent with the Spec Explainer view and gives the AI structured data to reason about rather than raw specs alone.

---

## Layout — Desktop (Specs View)

The Specs view replaces the product grid/table area. The list header (title, AI comment, budget, priorities, URL input) stays the same. The view toggle gains a third option.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                                  │
│  │ ◆    │  The Great TV Showdown        [⊞] [≡] [◫]  [Get AI Opinion]    │
│  │ side │  🤖 "Four contenders..."             ↑ specs                    │
│  │ bar  │  ──────────────────────────────────────────────────────────────  │
│  │      │  Budget: ₹30K-50K  ·  By: Mar 30  ·  👤👤 2 members             │
│  │ ───  │  [picture quality] [low input lag] [smart TV]                    │
│  │ Home │                                                                  │
│  │ list │  ┌──────────────────────────────────────────────────────────┐    │
│  │ list │  │  🔗  Paste a product URL...                      [Add]  │    │
│  │      │  └──────────────────────────────────────────────────────────┘    │
│  │      │                                                                  │
│  │      │  ╔══════════════════════════════════════════════════════════╗    │
│  │      │  ║  ✨ Spec Comparison                        [Regenerate] ║    │
│  │      │  ║  ⚠ 1 product added since last analysis                  ║    │
│  │      │  ╠══════════╦════════════╦════════════╦════════════════════╣    │
│  │      │  ║ Spec     ║ Sony A80L  ║ Samsung    ║ LG C3 OLED       ║    │
│  │      │  ║          ║            ║ S90C       ║                    ║    │
│  │      │  ╠══════════╬════════════╬════════════╬════════════════════╣    │
│  │      │  ║ Panel    ║  OLED ✓    ║  QLED      ║  OLED ✓           ║    │
│  │      │  ║ Type     ║            ║            ║                    ║    │
│  │      │  ║ ℹ OLED = perfect blacks, infinite contrast              ║    │
│  │      │  ╠──────────╬────────────╬────────────╬────────────────────╣    │
│  │      │  ║ Refresh  ║  120Hz ✓   ║  120Hz ✓   ║  60Hz             ║    │
│  │      │  ║ Rate     ║            ║            ║                    ║    │
│  │      │  ║ ℹ Higher = smoother motion for sports & gaming          ║    │
│  │      │  ╠──────────╬────────────╬────────────╬────────────────────╣    │
│  │      │  ║ HDR      ║ Dolby      ║ HDR10+     ║ Dolby             ║    │
│  │      │  ║ Format   ║ Vision ✓   ║ Adaptive   ║ Vision ✓          ║    │
│  │      │  ║ ℹ Dolby Vision = wider color range, scene-by-scene     ║    │
│  │      │  ╠──────────╬────────────╬────────────╬────────────────────╣    │
│  │      │  ║ ...6-12 rows total                                      ║    │
│  │      │  ╚══════════╩════════════╩════════════╩════════════════════╝    │
│  │      │                                                                  │
│  │      │  ╔══════════════════════════════════════════════════════════╗    │
│  │      │  ║  📊 Quality Dimensions                                  ║    │
│  │      │  ╠══════════╦════════════╦════════════╦════════════════════╣    │
│  │      │  ║ Dimen.   ║ Sony A80L  ║ Samsung    ║ LG C3 OLED       ║    │
│  │      │  ║          ║            ║ S90C       ║                    ║    │
│  │      │  ╠══════════╬════════════╬════════════╬════════════════════╣    │
│  │      │  ║ Picture  ║  ●●●●●    ║  ●●●●○    ║  ●●●●●            ║    │
│  │      │  ║ Quality  ║  5/5       ║  4/5       ║  5/5              ║    │
│  │      │  ║          ║  "Ref-     ║  "Bright   ║  "Excellent       ║    │
│  │      │  ║          ║   grade"   ║   but no   ║   for the         ║    │
│  │      │  ║          ║            ║   OLED     ║   price" 🌐       ║    │
│  │      │  ║          ║            ║   blacks"  ║                    ║    │
│  │      │  ╠──────────╬────────────╬────────────╬────────────────────╣    │
│  │      │  ║ Gaming   ║  ●●●●○    ║  ●●●●●    ║  ●●●○○            ║    │
│  │      │  ║ Perf.    ║  4/5       ║  5/5       ║  3/5              ║    │
│  │      │  ║          ║  "Low      ║  "Best     ║  "60Hz            ║    │
│  │      │  ║          ║   input    ║   VRR +    ║   limits          ║    │
│  │      │  ║          ║   lag"     ║   4K/120"  ║   gaming"         ║    │
│  │      │  ╠──────────╬────────────╬────────────╬────────────────────╣    │
│  │      │  ║ ...4-7 dimensions total                                 ║    │
│  │      │  ╚══════════╩════════════╩════════════╩════════════════════╝    │
│  │      │                                                                  │
│  │      │  Legend: ✓ = best in spec  🌐 = uses external knowledge         │
│  │      │  Generated Mar 28 via Gemini Flash                              │
│  │      │                                                                  │
│  └──────┘                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

View toggle detail:
  [⊞ Grid] [≡ Table] [◫ Specs]
  ↑ LayoutGrid  ↑ Table2  ↑ Columns3 (or FlaskConical)
  Active state: filled icon + bg-accent
  URL: ?view=grid | ?view=table | ?view=specs
```

---

## Layout — Mobile (Specs View)

On mobile, the full comparison table doesn't fit. Instead: a **card list** where each spec is a card showing explanation + best pick, with product values collapsed behind a tap.

```
┌───────────────────────────┐
│  ◆ ShopIt        [⊞][≡][◫]│
│  The Great TV Showdown     │
│  ───────────────────────── │
│                            │
│  ┌────────────────────────┐│
│  │ ✨ Spec Comparison      ││
│  │ ⚠ 1 product added      ││
│  │          [Regenerate]   ││
│  └────────────────────────┘│
│                            │
│  ┌────────────────────────┐│
│  │ Panel Type              ││
│  │ OLED = perfect blacks,  ││
│  │ infinite contrast       ││
│  │                         ││
│  │ 🏆 Best: Sony A80L,     ││
│  │         LG C3 (OLED)   ││
│  │                         ││
│  │ ▸ Show all values       ││
│  └────────────────────────┘│
│                            │
│  ┌────────────────────────┐│
│  │ Refresh Rate            ││
│  │ Higher = smoother       ││
│  │ motion for sports       ││
│  │                         ││
│  │ 🏆 Best: Sony, Samsung  ││
│  │         (120Hz)         ││
│  │                         ││
│  │ ▸ Show all values       ││
│  └────────────────────────┘│
│                            │
│  ... more spec cards       │
│                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━ │
│                            │
│  ┌────────────────────────┐│
│  │ 📊 Quality Dimensions   ││
│  └────────────────────────┘│
│                            │
│  ┌────────────────────────┐│
│  │ Picture Quality         ││
│  │ Color accuracy,         ││
│  │ contrast, HDR perf.     ││
│  │                         ││
│  │ Sony A80L     ●●●●● 5  ││
│  │ Samsung S90C  ●●●●○ 4  ││
│  │ LG C3 OLED   ●●●●● 5  ││
│  └────────────────────────┘│
│                            │
│  ┌────────────────────────┐│
│  │ Gaming Performance      ││
│  │ Input lag, VRR, resp.   ││
│  │                         ││
│  │ Sony A80L     ●●●●○ 4  ││
│  │ Samsung S90C  ●●●●● 5  ││
│  │ LG C3 OLED   ●●●○○ 3  ││
│  └────────────────────────┘│
│                            │
│  🌐 = uses external data   │
│  Generated Mar 28          │
│                            │
│  [Home] [Lists]  [+ New]   │
└───────────────────────────┘
```

**Key mobile differences:**

- Spec comparison renders as **stacked cards** instead of a table
- Each card shows: spec label, explanation, best pick(s)
- "Show all values" expands to reveal every product's value (collapsed by default to save space)
- Dimension ratings render as **compact horizontal bars** within cards — all products visible without scrolling horizontally
- No horizontal scroll table — that's a bad mobile experience

---

## Layout — Empty / Generating States

### No analysis yet (≥2 products)

```
┌──────────────────────────────────────────────┐
│                                              │
│    ◫  Spec Explainer                         │
│                                              │
│    Compare specs and see AI-generated        │
│    quality ratings across your products.     │
│                                              │
│    ┌────────────────────────────────┐        │
│    │  ✨ Generate Spec Analysis     │        │
│    └────────────────────────────────┘        │
│                                              │
│    Analyzes 4 products across key specs      │
│    and rates them on quality dimensions      │
│    tailored to TVs.                          │
│                                              │
└──────────────────────────────────────────────┘
```

### Not enough products (<2 completed)

```
┌──────────────────────────────────────────────┐
│                                              │
│    ◫  Spec Explainer                         │
│                                              │
│    Add at least 2 products to compare        │
│    specs and see quality ratings.            │
│                                              │
│    ┌──────────────────────────────────┐      │
│    │  🔗  Paste a product URL... [Add]│      │
│    └──────────────────────────────────┘      │
│                                              │
└──────────────────────────────────────────────┘
```

### Generating (loading state)

```
┌──────────────────────────────────────────────┐
│                                              │
│    ✨ Analyzing specs across 4 products...   │
│    ━━━━━━━━━━━━━━━░░░░░  ~3s                 │
│                                              │
│    ┌────────────────────────────────────┐    │
│    │  ░░░░░░░░░░░░░  ░░░░░  ░░░░░     │    │
│    │  ░░░░░░░░  ░░░░░░░  ░░░░░░░░     │    │
│    │  ░░░░░░░░░░░░░  ░░░░░  ░░░░░     │    │
│    └────────────────────────────────────┘    │
│                                              │
│    ┌────────────────────────────────────┐    │
│    │  ░░░░░░░░░░░░░  ░░░░░  ░░░░░     │    │
│    │  ░░░░░░░░  ░░░░░░░  ░░░░░░░░     │    │
│    └────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

Skeleton matches the two-table layout. Animated `pulse` on the skeleton rows. Progress bar is indeterminate but shows estimated time (~3s).

---

## Element Breakdown

| # | Element | Component | Implementation |
|---|---------|-----------|----------------|
| 1 | **View toggle (updated)** | shadcn `<ToggleGroup>` | Add third item: `Columns3` icon from Lucide. `value` synced to URL via `nuqs`. `type="single"` `variant="outline"`. Tooltip: "Specs (S)" with keyboard shortcut. |
| 2 | **Staleness banner** | Custom `<Alert>` | `bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800`. Icon: `AlertTriangle`. Text: "N products changed since last analysis". `[Regenerate]` button inline. Dismissable with `X` (but reappears on next page load). |
| 3 | **Spec comparison table (desktop)** | shadcn `<Table>` | Sticky first column (spec name). Product names as column headers. Each cell reads value from `product.specs[spec.product_spec_keys[product.id]]` + `✓` badge if product is in `spec.best_product_ids`. Missing key → "—". Explanation row spans full width below each spec row, `text-sm text-muted-foreground italic`. |
| 4 | **Spec card (mobile)** | shadcn `<Card>` | `rounded-lg p-4`. Header: spec label `font-medium`. Body: explanation `text-sm text-muted-foreground`. Best pick: `text-sm font-medium` with trophy icon. Expandable section: `<Collapsible>` showing all product values. |
| 5 | **Best-in-spec badge** | `<Badge variant="outline">` | Small `✓` checkmark in `text-emerald-600 dark:text-emerald-400` next to the spec value. Subtle, not overwhelming. Ties show multiple badges. |
| 6 | **Dimensions table (desktop)** | shadcn `<Table>` | Same column structure as spec table. Each cell: dot rating `●●●●○` + numeric `4/5` + one-line reasoning in `text-xs text-muted-foreground`. External knowledge icon `🌐` as tooltip trigger. |
| 7 | **Dimension card (mobile)** | shadcn `<Card>` | Dimension name + description header. Compact rows: product name + dot rating + score. Reasoning hidden behind tap (keeps cards scannable). |
| 8 | **Dot rating** | Custom `<DotRating>` | 5 dots, filled/empty. Filled: `text-foreground`. Empty: `text-muted-foreground/30`. Size: `w-2 h-2` circles in a row with `gap-0.5`. Accessible: `aria-label="4 out of 5"`. |
| 9 | **External knowledge indicator** | `<Tooltip>` with `Globe` icon | Small `🌐` icon next to reasoning text when `uses_external_knowledge: true`. Tooltip: "This rating factors in brand reputation and market data beyond the product page." |
| 10 | **Generate button (empty state)** | shadcn `<Button>` | `variant="default"` with sparkle icon. Text: "Generate Spec Analysis". Loading state: spinner + "Analyzing..." Disabled when <2 completed products. |
| 11 | **Section headers** | Custom `<h3>` | "✨ Spec Comparison" and "📊 Quality Dimensions" with `text-lg font-semibold`. Divider line below. Regenerate button aligned right of the spec comparison header. |
| 12 | **Legend footer** | `<p>` | `text-xs text-muted-foreground`. Shows: `✓ = best in spec`, `🌐 = uses external knowledge`, generation timestamp and model. |

---

## Component Tree

```
<SpecExplainerView>                        // top-level, receives specAnalysis + products
├── <SpecStalenessAlert>                   // conditional: shown when analysis is stale
│   └── [Regenerate] button
├── <SpecComparisonSection>                // "Spec Comparison" header + content
│   ├── <SpecComparisonTable>              // desktop: shadcn Table
│   │   ├── <TableHeader>                  // product names as columns
│   │   └── <SpecRow> × 6-12              // per-spec row + explanation sub-row
│   │       ├── <SpecValue>               // reads product.specs via key mapping + optional best badge
│   │       └── <SpecExplanation>         // full-width explanation row
│   └── <SpecComparisonCards>              // mobile: stacked cards
│       └── <SpecCard> × 6-12
│           ├── label + explanation
│           ├── best pick summary
│           └── <Collapsible> all values
├── <DimensionSection>                     // "Quality Dimensions" header + content
│   ├── <DimensionTable>                   // desktop: shadcn Table
│   │   └── <DimensionRow> × 4-7
│   │       └── <DimensionCell>           // dot rating + score + reasoning
│   │           ├── <DotRating>
│   │           └── <ExternalKnowledgeBadge>
│   └── <DimensionCards>                   // mobile: stacked cards
│       └── <DimensionCard> × 4-7
│           └── product rows with dot ratings
├── <SpecLegend>                           // footer with legend + timestamp
└── <SpecEmptyState>                       // shown when no analysis exists
    ├── variant="generate" (≥2 products)
    └── variant="not-enough" (<2 products)
```

**File placement:**

```
components/
  specs/
    spec-explainer-view.tsx          // top-level view component
    spec-comparison-table.tsx        // desktop table
    spec-comparison-cards.tsx        // mobile cards
    dimension-table.tsx              // desktop table
    dimension-cards.tsx              // mobile cards
    dot-rating.tsx                   // reusable 1-5 dot component
    spec-staleness-alert.tsx         // staleness banner
    spec-empty-state.tsx             // empty/not-enough states
    spec-legend.tsx                  // footer legend
```

---

## Animation Spec

### View Toggle Transition (Grid/Table → Specs)

Unlike grid↔table (which uses `layoutId` morphing), the specs view is a completely different layout. Use a simple crossfade:

```
Outgoing view (grid or table):
  0-150ms: opacity 1→0, scale 1→0.98

Incoming view (specs):
  150-400ms: opacity 0→1, y: 8→0
  Stagger: spec comparison table fades in first, then dimensions table 100ms later
```

Framer Motion:

```
<AnimatePresence mode="wait">
  {view === "specs" ? (
    <motion.div
      key="specs"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25 }}
    />
  ) : view === "grid" ? (
    <motion.div key="grid" ... />
  ) : (
    <motion.div key="table" ... />
  )}
</AnimatePresence>
```

### Spec Row Entry (Stagger)

On initial render or after regeneration:

```
Timeline:
─────────────────────────────────────────────────────
  0ms     Row 1    opacity 0→1, x: -8→0
  40ms    Row 2    opacity 0→1, x: -8→0
  80ms    Row 3    opacity 0→1, x: -8→0
  ...     Row N    +40ms per row
─────────────────────────────────────────────────────
  Each: duration 300ms, ease [0.25, 0.4, 0, 1]
```

### Best Badge Highlight

When a product is in `spec.best_product_ids`, the `✓` badge enters with a subtle pop:

```
0ms:    scale 0, opacity 0
100ms:  scale 1.2, opacity 1
200ms:  scale 1 (spring settle)
```

### Regenerate Button Loading

```
Click → button text morphs:
  "Regenerate" → spinner + "Analyzing..."
  Width animates smoothly (layout animation)

On complete → content crossfades:
  Old skeleton → New data (opacity 0→1, 300ms)
```

### Mobile Card Expand (Show All Values)

```
<Collapsible> with Framer Motion height animation:
  Collapsed: height 0, opacity 0
  Expanded:  height auto, opacity 1
  Duration: 200ms, ease-out
```

---

## Dark Mode Adaptation

| Element | Light | Dark |
|---------|-------|------|
| Table background | `bg-card` (white) | `bg-card` (#111) |
| Table border | `border-border` (zinc-200) | `border-border` (zinc-800) |
| Spec row hover | `bg-muted/50` | `bg-muted/30` |
| Explanation text | `text-muted-foreground` | `text-muted-foreground` (auto) |
| Best badge `✓` | `text-emerald-600` | `text-emerald-400` |
| Best badge bg | `bg-emerald-50` | `bg-emerald-950/30` |
| Staleness banner bg | `bg-amber-50` | `bg-amber-950/30` |
| Staleness banner border | `border-amber-200` | `border-amber-800` |
| Dot rating filled | `text-foreground` | `text-foreground` (auto) |
| Dot rating empty | `text-muted-foreground/30` | `text-muted-foreground/20` |
| External knowledge icon | `text-blue-500` | `text-blue-400` |
| Section header | `text-foreground` | `text-foreground` (auto) |
| Mobile card bg | `bg-card` | `bg-card` (auto) |

---

## Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Mobile (`< 640px`) | Card layout for both spec comparison and dimensions. No table. Spec values collapsed behind "Show all values" tap. View toggle shows all 3 icons but smaller. |
| Tablet (`640-1024px`) | Table layout but with horizontally scrollable container if >3 products. Sticky first column (spec name). Explanation rows wrap. |
| Desktop (`> 1024px`) | Full table layout. All columns visible. Sticky first column. Explanation rows inline below each spec. |

---

## Accessibility

- Spec comparison table uses proper `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`, `<th scope="row">`
- Dot rating has `aria-label="{score} out of 5"` and `role="img"`
- Best-in-spec badge has `aria-label="Best value for {spec_name}"`
- External knowledge icon has `aria-label="Rating uses external knowledge"` with tooltip
- Staleness alert has `role="alert"` for screen reader announcement
- View toggle has `aria-label="View mode"` with individual button labels
- Mobile collapsible sections have `aria-expanded` state
- Loading skeleton has `aria-busy="true"` and `aria-label="Generating spec analysis"`
- All tables have `aria-label="Spec comparison"` / `aria-label="Quality dimension ratings"`
- Focus order: staleness alert → spec table → dimension table → legend

---
