# Spec Explainer — Implementation Workflow

## Summary

Implementation of the Spec Explainer view: a third view mode on the List Detail page that provides AI-curated spec comparison, plain-English explanations, per-spec best-pick recommendations, and quality dimension ratings.

**Design spec:** `docs/system-guide/06f-spec-explainer-view.md`

---

## Phases

| Phase | Name | Description | Dependencies | Estimated Scope |
|-------|------|-------------|-------------|-----------------|
| 1 | [Database & Types](./01-database-and-types.md) | Migration, RLS, TypeScript types, Zod validators | None | 4 files |
| 2 | [AI Pipeline](./02-ai-pipeline.md) | Prompt builder, API route, response parsing | Phase 1 |  4 files |
| 3 | [View Toggle](./03-view-toggle.md) | Extend toggle to 3 modes, URL state, routing | None (parallel with 1-2) | 3 files |
| 4 | [Core Components](./04-core-components.md) | Spec table, dimension table, dot rating, mobile cards | Phase 1, 3 | 10 files |
| 5 | [Integration & Polish](./05-integration-and-polish.md) | Expert Opinion feed-in, staleness detection, animations, accessibility | Phase 2, 4 | 5 files |

---

## Dependency Graph

```
Phase 1 (DB + Types) ──────┐
                            ├──→ Phase 4 (Components) ──→ Phase 5 (Integration)
Phase 3 (View Toggle) ─────┘                                    ↑
                                                                 │
Phase 2 (AI Pipeline) ──────────────────────────────────────────┘
```

**Parallelism opportunities:**

- Phase 1 + Phase 3 can run in parallel (no dependency)
- Phase 2 can start as soon as Phase 1 types are done
- Phase 4 can start as soon as Phase 1 types + Phase 3 toggle are done (mock data for AI)
- Phase 5 requires all prior phases

---

## Testing Strategy (TDD)

Each phase follows the project's red-green-refactor cycle:

| Phase | Test Focus |
|-------|-----------|
| 1 | Zod schema validation: valid/invalid spec analysis shapes |
| 2 | API route: auth checks, minimum product validation, response shape, error cases |
| 3 | View toggle: URL state sync, three-way toggle behavior |
| 4 | Components: render with mock data, empty states, mobile vs desktop, dot rating edge cases |
| 5 | Staleness detection logic, Expert Opinion prompt includes dimensions when available |

---

## Files Created/Modified

### New Files

```
supabase/migrations/YYYYMMDD_spec_analysis.sql
lib/types/database.ts                          (modify — add ListSpecAnalysis type)
lib/validators/spec-analysis.ts                (new)
lib/ai/prompts.ts                              (modify — add buildSpecAnalysisPrompt)
app/api/lists/[listId]/spec-analysis/route.ts  (new)
components/specs/spec-explainer-view.tsx        (new)
components/specs/spec-comparison-table.tsx      (new)
components/specs/spec-comparison-cards.tsx      (new)
components/specs/dimension-table.tsx            (new)
components/specs/dimension-cards.tsx            (new)
components/specs/dot-rating.tsx                 (new)
components/specs/spec-staleness-alert.tsx       (new)
components/specs/spec-empty-state.tsx           (new)
components/specs/spec-legend.tsx                (new)
```

### Modified Files

```
lib/types/database.ts          — add ListSpecAnalysis, SpecComparison, Dimension types
lib/ai/prompts.ts              — add buildSpecAnalysisPrompt, modify buildExpertOpinionPrompt
components/lists/list-detail-content.tsx  — add "specs" to view state, render SpecExplainerView
components/lists/list-filters.tsx        — extend ToggleGroup to 3 options (or new ViewToggle component)
app/(app)/lists/[listId]/page.tsx        — fetch spec analysis in parallel data load
hooks/use-realtime-products.ts           — add channel for list_spec_analyses changes (optional)
```
