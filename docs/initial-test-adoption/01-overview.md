# Test Adoption Plan — Overview

## Current State

### What Exists
- **Test framework:** Vitest + jsdom + @testing-library/react (configured, working)
- **4 test files, ~280 LOC:**
  - `lib/validators/lists.test.ts` — createListSchema, updateListSchema validation
  - `lib/validators/products.test.ts` — addProductSchema, toggleShortlistSchema validation
  - `lib/validators/members.test.ts` — inviteMemberSchema validation
  - `lib/utils.test.ts` — formatPrice, formatPriceRange, extractDomain, relativeTime
- **Scripts:** `npm test` (vitest watch), `npm run test:run` (single run)
- **CI/CD:** None. No GitHub Actions, no pre-commit hooks.

### What's Missing
- No Server Action tests (8 files, ~1500 LOC, zero coverage)
- No API route tests (expert-opinion endpoint)
- No component tests (65+ components)
- No hook tests (useRealtimeProducts)
- No AI module tests (gemini.ts, prompts.ts)
- No Edge Function tests (ingest-product, suggest-products)
- No validator tests for comments, suggestions, ai schemas
- No CI pipeline to enforce any of this

## Goals

1. **Gate deployments on passing tests** — nothing ships if tests fail
2. **Enable TDD** — every new feature starts with a failing test
3. **Cover the riskiest code first** — Server Actions (auth, RBAC, data mutations) before UI

## Test Pyramid for ShopIt

```
          /  E2E  \          — Future: Playwright (critical user journeys)
         /─────────\
        / Component  \       — @testing-library/react (interactive components)
       /──────────────\
      /  Server Action   \   — Vitest + mocked Supabase (business logic)
     /────────────────────\
    /  Validators + Utils    \ — Vitest (pure functions, zero mocking)
   /──────────────────────────\
```

**Priority order:** Validators/Utils > Server Actions > AI modules > Components > E2E

## Document Index

| File | Covers |
|------|--------|
| [`01-overview.md`](01-overview.md) | This document — current state, goals, strategy |
| [`02-infrastructure.md`](02-infrastructure.md) | CI pipeline, test scripts, coverage thresholds, mocking patterns |
| [`03-validators-and-utils.md`](03-validators-and-utils.md) | Missing pure-function tests |
| [`04-server-actions.md`](04-server-actions.md) | All 8 action files — auth, RBAC, validation, DB, side effects |
| [`05-api-routes.md`](05-api-routes.md) | Expert opinion endpoint |
| [`06-ai-modules.md`](06-ai-modules.md) | gemini.ts (fetch mocking), prompts.ts (output shape) |
| [`07-components.md`](07-components.md) | Interactive components worth testing |
| [`08-hooks.md`](08-hooks.md) | useRealtimeProducts Realtime subscription |
| [`09-edge-functions.md`](09-edge-functions.md) | Supabase Edge Functions (ingest, suggest) |
| [`10-implementation-order.md`](10-implementation-order.md) | Phased rollout with estimated test counts |
