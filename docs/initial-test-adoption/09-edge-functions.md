# Edge Functions — Test Inventory

Edge Functions run in Supabase's Deno runtime and are invoked via `supabase.functions.invoke()`. They are harder to unit test in Vitest because they use Deno APIs.

**Strategy:** Test the _logic_ by extracting core logic into importable modules (if we refactor), or test end-to-end via integration tests. For now, document what _should_ be tested and defer to integration/E2E.

---

## `supabase/functions/ingest-product/index.ts` (~12 ideal tests)

**What it does:** Receives a product INSERT webhook, scrapes the URL via Firecrawl, extracts structured data via Gemini, saves results back.

### If we extract logic into testable modules:

```
URL scraping
  - calls Firecrawl API with the product URL
  - handles Firecrawl API errors gracefully
  - handles Firecrawl returning empty content
  - handles Firecrawl timeout

AI extraction
  - calls callGemini with buildExtractionPrompt
  - parses the JSON response into structured product data
  - handles malformed JSON from Gemini
  - handles Gemini API errors

Status updates
  - sets extraction_status to "processing" before scraping
  - sets extraction_status to "completed" on success with extracted data
  - sets extraction_status to "failed" with extraction_error on error
  - does not overwrite data if product was already completed
```

### Recommended refactoring for testability:

Extract the scrape + extract logic into `lib/ai/extract-product.ts` so it can be imported and tested in Vitest without the Deno Edge Function wrapper. The Edge Function handler becomes a thin orchestrator.

---

## `supabase/functions/suggest-products/index.ts` (~8 ideal tests)

**What it does:** Fetches list context, calls Gemini with grounded search to find complementary products, inserts suggestions.

### If we extract logic:

```
Context assembly
  - fetches list, products, and context answers
  - builds prompt with gap detection data

AI call
  - calls Gemini with buildSmartSuggestionsPrompt
  - uses grounded search (tools: google_search)
  - parses suggestions JSON

Validation
  - filters out suggestions with URLs that already exist in the list
  - filters out suggestions with invalid URLs
  - handles empty suggestions array

Insertion
  - inserts valid suggestions as product_suggestion rows
  - sets status to "pending" for new suggestions
```

---

## Testing approach (practical)

Since these run in Deno and depend on Supabase infra, the most practical options are:

1. **Extract pure logic** into `lib/` modules and unit test those (recommended)
2. **Integration tests** using a test Supabase project (future)
3. **E2E tests** that trigger the full flow via the app UI (future)

For Phase 1, we should at minimum extract `buildExtractionPrompt` and `buildSmartSuggestionsPrompt` (already done — they live in `lib/ai/prompts.ts`) and test those thoroughly. The remaining Edge Function logic (HTTP calls, DB writes) gets covered when we add integration tests.

---

## Summary

| Edge Function | Ideal Tests | Phase 1 Coverage |
|---------------|-------------|------------------|
| `ingest-product` | ~12 | Covered via prompts.test.ts + gemini.test.ts |
| `suggest-products` | ~8 | Covered via prompts.test.ts + gemini.test.ts |
| **Total** | **~20** | Defer full coverage to integration phase |
