# Implementation Order

Phased rollout — each phase is a PR that must pass CI before merging. Earlier phases unlock TDD for all future work.

---

## Phase 0: Infrastructure (do first)

**Goal:** CI pipeline exists and gates on tests + lint + typecheck.

| Task | Details |
|------|---------|
| Add `.github/workflows/ci.yml` | lint, typecheck, test:run --coverage |
| Add `typecheck` script to package.json | `tsc --noEmit` |
| Install `@vitest/coverage-v8` | Coverage provider |
| Update `vitest.config.ts` | Add coverage config with initial thresholds |
| Create `__tests__/helpers/` | mock-supabase.ts, fixtures.ts |
| Verify existing tests pass in CI | Sanity check |

**Tests added:** 0 (infrastructure only)
**Estimated effort:** Small

---

## Phase 1: Validators & Utils (pure functions)

**Goal:** 100% coverage on all Zod schemas and utility functions. Zero mocking, fast to write.

| Task | New Tests |
|------|-----------|
| Create `lib/validators/comments.test.ts` | ~12 |
| Create `lib/validators/suggestions.test.ts` | ~6 |
| Create `lib/validators/ai.test.ts` | ~5 |
| Expand `lib/validators/products.test.ts` | ~8 |
| Expand `lib/validators/lists.test.ts` | ~4 |
| Expand `lib/validators/members.test.ts` | ~8 |
| Expand `lib/utils.test.ts` | ~8 |

**Tests added:** ~51
**Running total:** ~74 (23 existing + 51 new)
**Estimated effort:** Small

---

## Phase 2: AI Modules (prompt builders + Gemini wrapper)

**Goal:** Cover prompt structure and Gemini client behavior including retry logic.

| Task | New Tests |
|------|-----------|
| Create `lib/ai/__tests__/prompts.test.ts` | ~18 |
| Create `lib/ai/__tests__/gemini.test.ts` | ~10 |

**Tests added:** ~28
**Running total:** ~102
**Estimated effort:** Small-Medium

---

## Phase 3: Server Actions — Core CRUD

**Goal:** Cover the highest-risk business logic — auth, RBAC, and data mutations.

| Task | New Tests |
|------|-----------|
| Create `lib/actions/__tests__/lists.test.ts` | ~18 |
| Create `lib/actions/__tests__/products.test.ts` | ~30 |
| Create `lib/actions/__tests__/comments.test.ts` | ~22 |
| Create `lib/actions/__tests__/members.test.ts` | ~28 |

**Tests added:** ~98
**Running total:** ~200
**Estimated effort:** Medium-Large (most complex mocking)

---

## Phase 4: Server Actions — AI & Suggestions

**Goal:** Cover AI-dependent actions, suggestion state machine, context question flows.

| Task | New Tests |
|------|-----------|
| Create `lib/actions/__tests__/ai.test.ts` | ~10 |
| Create `lib/actions/__tests__/chat.test.ts` | ~6 |
| Create `lib/actions/__tests__/suggestions.test.ts` | ~18 |
| Create `lib/actions/__tests__/context-questions.test.ts` | ~22 |

**Tests added:** ~56
**Running total:** ~256
**Estimated effort:** Medium

---

## Phase 5: API Route + Hook

**Goal:** Cover the expert opinion endpoint and Realtime subscription hook.

| Task | New Tests |
|------|-----------|
| Create `app/api/lists/[listId]/expert-opinion/route.test.ts` | ~14 |
| Create `hooks/__tests__/use-realtime-products.test.ts` | ~10 |

**Tests added:** ~24
**Running total:** ~280
**Estimated effort:** Small-Medium

---

## Phase 6: Components — Forms & Interactions

**Goal:** Cover the most interactive components — forms, dialogs, actions.

| Task | New Tests |
|------|-----------|
| `create-list-dialog.test.tsx` | ~8 |
| `add-product-form.test.tsx` | ~7 |
| `invite-member-dialog.test.tsx` | ~6 |
| `comment-input.test.tsx` | ~5 |
| `list-settings-form.test.tsx` | ~5 |

**Tests added:** ~31
**Running total:** ~311
**Estimated effort:** Medium

---

## Phase 7: Components — Display & State

**Goal:** Cover product cards, AI cards, member list, comment threads.

| Task | New Tests |
|------|-----------|
| `product-card.test.tsx` | ~6 |
| `product-actions.test.tsx` | ~5 |
| `product-detail-panel.test.tsx` | ~4 |
| `expert-opinion-card.test.tsx` | ~4 |
| `suggestion-card.test.tsx` | ~4 |
| `context-question-popup.test.tsx` | ~5 |
| `chat-panel.test.tsx` | ~5 |
| `member-list.test.tsx` | ~5 |
| `comment-thread.test.tsx` | ~4 |
| `list-card.test.tsx` | ~4 |
| `list-filters.test.tsx` | ~3 |
| `price-display.test.tsx` | ~3 |
| `empty-state.test.tsx` | ~2 |

**Tests added:** ~54 (pick the most valuable subset first)
**Running total:** ~365
**Estimated effort:** Medium

---

## Future: E2E & Integration

Not in scope for initial adoption, but plan for:

- **Playwright E2E** for critical user journeys (login → create list → add product → get opinion)
- **Integration tests** with a test Supabase project for RLS policy verification
- **Edge Function tests** with extracted logic modules

---

## Grand Total

| Phase | Tests | Cumulative |
|-------|-------|------------|
| Existing | 23 | 23 |
| Phase 0: Infrastructure | 0 | 23 |
| Phase 1: Validators & Utils | ~51 | ~74 |
| Phase 2: AI Modules | ~28 | ~102 |
| Phase 3: Server Actions (Core) | ~98 | ~200 |
| Phase 4: Server Actions (AI) | ~56 | ~256 |
| Phase 5: API Route + Hook | ~24 | ~280 |
| Phase 6: Components (Forms) | ~31 | ~311 |
| Phase 7: Components (Display) | ~54 | ~365 |
| **Total** | **~342 new tests** | **~365** |

After Phase 5 (~280 tests), TDD is fully enabled for all backend work. Phases 6-7 can be done incrementally as we touch those components.
