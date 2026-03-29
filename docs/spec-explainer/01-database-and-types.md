# Phase 1: Database & Types

## Goal

Create the `list_spec_analyses` table, RLS policies, TypeScript types, and Zod validators so the rest of the system has a typed contract to build against.

---

## Tasks

### 1.1 SQL Migration

**File:** `supabase/migrations/YYYYMMDD_spec_analysis.sql`

Create the table, RLS policy, and enable RLS:

```sql
-- Table
create table public.list_spec_analyses (
  id              uuid primary key default gen_random_uuid(),
  list_id         uuid not null unique references public.lists(id) on delete cascade,
  spec_comparison jsonb not null default '[]',  -- metadata only; values read from product.specs
  dimensions      jsonb not null default '[]',
  product_count   integer,
  product_ids     uuid[] default '{}',
  generated_at    timestamptz not null default now(),
  model_version   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Enable RLS
alter table public.list_spec_analyses enable row level security;

-- Read: list members only
create policy "Members can view spec analysis"
  on list_spec_analyses for select
  using (
    list_id in (
      select list_id from list_members where user_id = auth.uid()
    )
  );

-- No insert/update/delete policies for authenticated users
-- Writes happen via service_role (admin client) in the API route
```

**Test (red):** Query the table as an authenticated user who is NOT a member — should return empty. Query as a member — should return the row.

### 1.2 TypeScript Types

**File:** `lib/types/database.ts` (modify)

Add these types alongside existing ones:

```typescript
// Spec Comparison types (metadata only — values read from product.specs at render time)
export type SpecComparisonRow = {
  key: string                              // concept ID (e.g., "panel_type")
  label: string                            // display name (e.g., "Panel Type")
  explanation: string                      // one-liner for buyers
  best_product_ids: string[]               // product IDs with best value (ties allowed)
  product_spec_keys: Record<string, string> // maps product_id → actual key in product.specs
}

// Dimension Rating types
export type DimensionRating = {
  product_id: string
  score: number  // 1-5
  reasoning: string
  uses_external_knowledge: boolean
}

export type Dimension = {
  name: string
  description: string
  ratings: DimensionRating[]
}

// Top-level entity
export type ListSpecAnalysis = {
  id: string
  list_id: string
  spec_comparison: SpecComparisonRow[]
  dimensions: Dimension[]
  product_count: number | null
  product_ids: string[]
  generated_at: string
  model_version: string | null
  created_at: string
  updated_at: string
}
```

### 1.3 Zod Validators

**File:** `lib/validators/spec-analysis.ts` (new)

```typescript
import { z } from "zod/v4"

// Response shape from Gemini (used to validate AI output)
export const specComparisonRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  explanation: z.string(),
  best_product_ids: z.array(z.string().uuid()).min(1),
  product_spec_keys: z.record(z.string().uuid(), z.string()),  // { product_id: spec_key }
})

export const dimensionRatingSchema = z.object({
  product_id: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  reasoning: z.string(),
  uses_external_knowledge: z.boolean(),
})

export const dimensionSchema = z.object({
  name: z.string(),
  description: z.string(),
  ratings: z.array(dimensionRatingSchema).min(1),
})

export const specAnalysisResponseSchema = z.object({
  spec_comparison: z.array(specComparisonRowSchema).min(1).max(15),
  dimensions: z.array(dimensionSchema).min(1).max(10),
})

// Input schema for the generate action
export const generateSpecAnalysisSchema = z.object({
  listId: z.string().uuid(),
})
```

**Tests (red then green):**

- Valid spec analysis JSON passes validation
- Missing `product_id` in `best_product_ids` fails UUID check
- Score outside 1-5 fails
- Empty `spec_comparison` array fails
- Empty `best_product_ids` array fails
- Invalid key in `product_spec_keys` (non-UUID key) fails
- Empty `product_spec_keys` is valid (product might lack that spec)

---

## Acceptance Criteria

- [ ] Migration runs cleanly on local Supabase
- [ ] RLS blocks non-members from reading
- [ ] RLS allows member reads
- [ ] Service role can insert/update (admin client)
- [ ] TypeScript types compile and match the SQL schema
- [ ] Zod validators accept valid AI responses and reject malformed ones
- [ ] All tests pass
