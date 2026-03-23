# ShopIt — Implementation Workflow

Generated: 2026-03-23

This workflow breaks the ShopIt build into ordered phases with explicit dependencies. Each phase produces a working increment — you can demo after every phase.

## Phase Map

| Phase | Name | Depends On | Deliverable |
|-------|------|------------|-------------|
| 1 | [Project Bootstrap](./01-project-bootstrap.md) | Nothing | Next.js app running locally with Supabase connected |
| 2 | [Database & Auth](./02-database-and-auth.md) | Phase 1 | Schema deployed, RLS active, magic link login working |
| 3 | [Core Types & Shared Code](./03-core-types-and-shared.md) | Phase 2 | TypeScript types, Zod validators, ActionResult pattern, Supabase clients |
| 4 | [Global Shell & Theming](./04-global-shell-and-theming.md) | Phase 3 | Sidebar, header, bottom tabs, dark/light theme, command palette skeleton |
| 5 | [Lists CRUD & Dashboard](./05-lists-crud-and-dashboard.md) | Phase 4 | Create/view/archive lists, dashboard card grid, empty state |
| 6 | [Products & URL Ingestion](./06-products-and-ingestion.md) | Phase 5 | Add product by URL, Supabase Edge Function, Firecrawl + Gemini extraction, Realtime updates |
| 7 | [Product Detail & Interactions](./07-product-detail-and-interactions.md) | Phase 6 | Product detail sheet, shortlist/purchase toggles, specs/reviews display |
| 8 | [Collaboration](./08-collaboration.md) | Phase 7 | Invite members, role management, Realtime member updates, comments |
| 9 | [AI Features](./09-ai-features.md) | Phase 8 | AI hype titles, AI comment bubbles, Expert Opinion panel |
| 10 | [Polish & Deploy](./10-polish-and-deploy.md) | Phase 9 | Animations, loading states, a11y audit, Vercel production deploy |

## How to Use This Workflow

- Each phase doc has a **Checklist** at the top — use it to track progress
- **Manual steps** (Supabase dashboard, Vercel dashboard, API key setup) are called out with a wrench icon and explicit click-by-click instructions
- **Code locations** reference the folder structure from `CLAUDE.md` and the system guide specs
- **Test checkpoints** are included — don't skip them, they catch integration issues early
- **Phase order matters** — each phase depends on the previous one being complete

## Best Practices Audit (2026-03-23)

This workflow was audited against the system guide specs. Key decisions:

| Area | Decision |
|------|----------|
| **Migrations** | Split into 3 files: tables → RLS → triggers. Respects dependency order. |
| **RLS** | `profiles_select` restricted to authenticated users (not `using (true)`). `list_ai_opinions` has explicit deny policies for authenticated writes. Self-referential `list_members` policy tested for correctness. |
| **Security** | Service role key handling documented with rotation guidance. Never imported in Server Actions. |
| **DRY** | All AI prompts consolidated in `lib/ai/prompts.ts`. Revalidation strategy references single source of truth in `07-api-contracts.md`. Error codes defined once in `lib/types/actions.ts`. |
| **Indexes** | Added `idx_products_extraction_status` (partial index) — not in original spec but needed by Edge Function queries. |
| **Invite tokens** | Added `invite_tokens` table with TTL, token generation algorithm, and acceptance route. |
| **Comment threading** | Clarified: one level only. Replies to replies become siblings under the same parent. |
| **Webhook timing** | Deferred from Phase 2 to Phase 6 — function must exist before webhook targets it. |
| **Phase dependencies** | Phase 5 Create List dialog includes AI title placeholder state so Phase 9 can swap in the real implementation without restructuring. |
