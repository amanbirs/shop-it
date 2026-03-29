# Phase 2: AI Pipeline

## Goal

Build the API route and prompt that generates the spec analysis — calling Gemini, parsing the response, validating it with Zod, and writing to `list_spec_analyses`.

**Depends on:** Phase 1 (types and validators must exist)

---

## Tasks

### 2.1 Prompt Builder

**File:** `lib/ai/prompts.ts` (modify — add function)

Add `buildSpecAnalysisPrompt(products, list, userContext)` following the same pattern as `buildExpertOpinionPrompt`:

- Takes: array of completed products (with id, title, brand, model, price, specs, pros, cons, rating, review_count, ai_summary), list metadata (category, priorities, budget), user context
- Returns: string prompt

**Key prompt requirements (from design spec):**

- Select 6-12 differentiating specs for the category
- One-sentence explanation per spec
- List which product(s) have the best value per spec (ties allowed) as `best_product_ids`
- Provide a `product_spec_keys` mapping for each spec: maps each product_id to the actual key in that product's `specs` JSONB (products may use different key names for the same concept — e.g., `panel_type` vs `display_technology`)
- Generate 4-7 quality dimensions appropriate to the category
- Rate each product 1-5 per dimension with one-sentence reasoning
- Mark `uses_external_knowledge: true` when using data beyond what's in the product page
- Weight user priorities higher
- Output strict JSON matching `specAnalysisResponseSchema`

**Important:** Product IDs must be passed as-is in the prompt so the AI returns them in the response. The AI also receives each product's full `specs` JSONB so it can identify the correct key names per product for the `product_spec_keys` mapping.

### 2.2 API Route

**File:** `app/api/lists/[listId]/spec-analysis/route.ts` (new)

Follow the Expert Opinion route pattern exactly:

```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  // 1. Auth: get user, verify editor/owner membership
  // 2. Fetch: get products where extraction_status = 'completed' and archived_at is null
  // 3. Validate: require >= 2 completed products
  // 4. Fetch: get list metadata (category, priorities, budget)
  // 5. Fetch: get user context from profiles
  // 6. Build prompt: buildSpecAnalysisPrompt(products, list, userContext)
  // 7. Call Gemini: callGemini(prompt, { jsonMode: true, maxTokens: 8192 })
  // 8. Parse + validate: JSON.parse → specAnalysisResponseSchema.parse()
  // 9. Upsert: admin client → list_spec_analyses, on conflict (list_id)
  // 10. Revalidate: revalidatePath('/lists/{listId}')
  // 11. Return: { success: true, data: specAnalysis }
}
```

**Error responses (match existing pattern):**

| Status | When |
|--------|------|
| 401 | User not authenticated |
| 403 | User not editor/owner of this list |
| 422 | <2 completed products |
| 500 | Gemini call failed or response validation failed |

### 2.3 Modify Expert Opinion Prompt

**File:** `lib/ai/prompts.ts` (modify `buildExpertOpinionPrompt`)

When spec analysis exists for the list, append a structured section to the Expert Opinion prompt:

```
## Pre-computed Dimension Ratings
The following quality dimensions have already been evaluated for this product set.
Use these as a foundation — you may adjust if you disagree, but explain why.

Picture Quality: Sony A80L = 5/5 (Ref-grade color), Samsung S90C = 4/5 (Bright but no OLED blacks), ...
Gaming Performance: Sony A80L = 4/5 (...), Samsung S90C = 5/5 (...), ...
```

This is additive — if no spec analysis exists, the Expert Opinion prompt works exactly as before.

---

## Tests

### 2.1 Prompt Builder Tests

- Prompt includes all product IDs
- Prompt includes list category and priorities
- Prompt includes budget range
- Prompt includes user context when available
- Prompt specifies JSON output format

### 2.2 API Route Tests

- **Auth:** Returns 401 for unauthenticated, 403 for viewer/non-member
- **Validation:** Returns 422 when <2 completed products
- **Success:** Returns 200 with valid `ListSpecAnalysis` shape
- **Idempotent:** Calling twice upserts (doesn't create duplicate rows)
- **Stale data:** Updates `product_count` and `product_ids` on regeneration

### 2.3 Expert Opinion Integration Tests

- Expert Opinion prompt includes dimension section when spec analysis exists
- Expert Opinion prompt works normally when spec analysis doesn't exist

---

## Acceptance Criteria

- [ ] API route generates and stores spec analysis for a list with ≥2 products
- [ ] Response validates against Zod schema
- [ ] Upsert works correctly (regenerating replaces, doesn't duplicate)
- [ ] Auth checks match Expert Opinion pattern
- [ ] Expert Opinion prompt incorporates dimensions when available
- [ ] All tests pass
