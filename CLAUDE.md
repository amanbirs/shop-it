# ShopIt

A collaborative purchase research tool that turns product URLs into structured, comparable cards — built for families deciding on big purchases together.

## System Guide

All design and architecture specs live in `docs/system-guide/`. These are the source of truth for how the app works and should be kept up to date as the codebase evolves.

| Spec | File | Covers |
|------|------|--------|
| Stack & Architecture | [`01-stack-and-architecture.md`](docs/system-guide/01-stack-and-architecture.md) | Tech stack choices, high-level architecture diagram, cost estimates |
| Data Model | [`02-data-model.md`](docs/system-guide/02-data-model.md) | Postgres schema, RLS policies, indexes, JSONB design decisions |
| Backend Architecture | [`03-backend-architecture.md`](docs/system-guide/03-backend-architecture.md) | Server Actions, API routes, Edge Function ingestion pipeline, Realtime subscriptions, Gemini extraction |
| Frontend Architecture | [`04-frontend-architecture.md`](docs/system-guide/04-frontend-architecture.md) | Component tree, theming system, design principles, interaction patterns |
| Design Research | [`05-design-research.md`](docs/system-guide/05-design-research.md) | UX research, competitive analysis, design rationale |
| Pages & Flows | [`06-pages.md`](docs/system-guide/06-pages.md) | Login, Dashboard — then links to sub-specs below |
| — List Detail | [`06a-page-list-detail.md`](docs/system-guide/06a-page-list-detail.md) | Product grid/table, filters, Expert Opinion panel, AI suggestions |
| — Product Detail Sheet | [`06b-product-detail-sheet.md`](docs/system-guide/06b-product-detail-sheet.md) | Right sheet, accordion sections, comments, extraction states |
| — List Creation Flow | [`06c-list-creation-flow.md`](docs/system-guide/06c-list-creation-flow.md) | Create dialog, AI hype title generation, progressive disclosure |
| — Invite & Share Flow | [`06d-invite-share-flow.md`](docs/system-guide/06d-invite-share-flow.md) | Email + link invites, role management, member list |
| — Global Shell | [`06e-global-shell.md`](docs/system-guide/06e-global-shell.md) | Sidebar, header, command palette, bottom tabs, page transitions |
| API Contracts | [`07-api-contracts.md`](docs/system-guide/07-api-contracts.md) | Server Action input/output schemas, Zod validators, error codes, Realtime channels |
| Standards | [`08-standards.md`](docs/system-guide/08-standards.md) | TypeScript, React/Next.js, Tailwind, Supabase, testing, error handling, git, accessibility, performance conventions |

### Using these docs

The system guide represents the **current correct state** of the project — not a historical record of what was planned or what changed. It is the definitive reference for how the app works right now.

- **Before building a feature**, read the relevant spec. It has the layout, component breakdown, animation spec, and design decisions already made.
- **During development**, update the spec if you deviate from it. If the code and the spec disagree, fix whichever is wrong — never leave them out of sync.
- **When onboarding**, read 01 → 02 → 03 → 04 in order for the full architecture picture, then jump to specific page specs as needed.
- **When making decisions**, refer to the system guide first. If a question is answered there, follow it. If it's not, make the decision and update the guide.

## Development Approach

### TDD — Red, Green, Refactor

We follow test-driven development for all feature work:

1. **Red** — Write a failing test that describes the expected behavior. For Server Actions, test the input validation (Zod schema) and the expected return shape. For components, test rendering and interaction. For API routes, test request/response contracts.
2. **Green** — Write the minimum code to make the test pass. No premature abstractions, no extra features.
3. **Refactor** — Clean up the passing code. Extract shared logic, improve naming, remove duplication — but only while tests stay green.

**What to test:**
- Server Actions: input validation, auth checks, return shapes, error cases
- API routes: request validation, response schema, error responses
- Components: rendering with props, user interactions, loading/error states
- Hooks: Realtime subscription setup, optimistic update behavior
- Zod schemas: valid input passes, invalid input fails with correct error

**What NOT to test:**
- Supabase queries directly (RLS handles access control; test via integration)
- Styling / CSS classes
- Third-party library internals (shadcn, Framer Motion)

### Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS 4
- **Components:** shadcn/ui
- **Database:** Supabase (Postgres + Auth + Realtime + Edge Functions)
- **AI:** Google Gemini API (Flash for extraction/titles, Flash or Pro for Expert Opinion)
- **Scraping:** Firecrawl
- **Hosting:** Vercel

### Project Structure

```
app/
  (auth)/                    # Unauthenticated routes (login, callback)
  (app)/                     # Authenticated routes (dashboard, lists)
    layout.tsx               # Global shell (sidebar + header)
    page.tsx                 # Dashboard
    lists/[listId]/page.tsx  # List detail
  api/                       # API routes (expert opinion)

components/
  ui/                        # shadcn/ui primitives
  layout/                    # Sidebar, header, nav
  lists/                     # List domain components
  products/                  # Product domain components
  ai/                        # AI feature components
  collaboration/             # Multi-user components
  common/                    # Shared utilities

lib/
  supabase/                  # Supabase client setup (server, client, admin)
  actions/                   # Server Actions (lists, products, members, comments)
  ai/                        # AI prompt templates and parsing
  validators/                # Zod schemas (shared between client + server)

hooks/                       # Custom React hooks (Realtime, optimistic updates)

supabase/
  functions/                 # Edge Functions (ingest-product worker)
  migrations/                # SQL migrations

docs/system-guide/           # Architecture and design specs (keep updated!)
```

### Conventions

- **Server Actions** return `ActionResult<T>` — a discriminated union of `{ success: true, data: T }` or `{ success: false, error: ActionError }`. See [`07-api-contracts.md`](docs/system-guide/07-api-contracts.md) for the full pattern.
- **Error codes** are standardized: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `AI_ERROR`, `SCRAPING_ERROR`, `INTERNAL_ERROR`.
- **Zod schemas** in `lib/validators/` are shared between form validation (client) and Server Actions (server). Single source of truth.
- **Components** are Server Components by default. Add `'use client'` only when interactivity requires it. Push the client boundary down.
- **Theming** uses CSS custom properties (semantic tokens like `--background`, `--foreground`, `--ai-accent`). Both light and dark themes are first-class. See [`04-frontend-architecture.md`](docs/system-guide/04-frontend-architecture.md) for the full token list.
- **Optimistic UI** for all mutations. The UI updates immediately; the server confirms or reverts.
- **Realtime** via Supabase channels for product changes, comments, and member updates.
