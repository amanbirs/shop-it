# ShopIt — Standards & Coding Practices

Ground rules for writing code in this project. Follow these unless there's a good reason not to — and if there is, document the exception.

---

## TypeScript

### Strict mode, no shortcuts

- `strict: true` in `tsconfig.json`. No `any` unless interfacing with an untyped third-party library — and even then, wrap it in a typed utility.
- Prefer `unknown` over `any` for values with uncertain shapes. Narrow with type guards.
- No `@ts-ignore`. Use `@ts-expect-error` with a comment explaining *why* if absolutely necessary.
- No non-null assertions (`!`) unless the assertion is provably safe (e.g., after a `.find()` with a preceding `.some()` check). Prefer optional chaining + explicit handling.

### Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Files & directories | `kebab-case` | `product-card.tsx`, `use-realtime-products.ts` |
| React components | `PascalCase` | `ProductCard`, `ExpertOpinionPanel` |
| Functions & variables | `camelCase` | `toggleShortlist`, `isShortlisted` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_PRODUCTS_PER_LIST`, `DEFAULT_CURRENCY` |
| Types & interfaces | `PascalCase` | `ActionResult<T>`, `Product`, `ListMember` |
| Zod schemas | `camelCase` + `Schema` suffix | `createListSchema`, `addProductSchema` |
| Server Actions | `camelCase` verb-first | `createList`, `toggleShortlist`, `archiveProduct` |
| Hooks | `use` prefix, `camelCase` | `useRealtimeProducts`, `useOptimisticAction` |
| CSS variables | `--kebab-case` | `--ai-accent`, `--muted-foreground` |
| Database columns | `snake_case` | `is_shortlisted`, `extraction_status`, `ai_verdict` |
| URL params | `kebab-case` | `list-id`, `view-mode` (but Next.js dynamic routes use `[listId]` camelCase) |

### Types over interfaces (mostly)

Use `type` for object shapes, unions, and intersections. Use `interface` only when you need declaration merging (rare) or extending third-party types. Consistency > style preference — pick one and stick with it.

```typescript
// Preferred
type Product = {
  id: string
  title: string | null
  specs: Record<string, string>
}

// Use interface only when extending
interface SupabaseProduct extends Product {
  created_at: string
}
```

### Enums: avoid

Use union types instead of TypeScript enums. Enums generate runtime code, behave unexpectedly in some contexts, and don't play well with Zod.

```typescript
// Bad
enum Role { Owner = 'owner', Editor = 'editor', Viewer = 'viewer' }

// Good
type Role = 'owner' | 'editor' | 'viewer'
```

---

## React & Next.js

### Server Components by default

Every component is a Server Component unless it needs interactivity. The `'use client'` directive is an opt-in, not a default. Push the client boundary as far down the tree as possible.

```
// Good: only the button is a client component
// page.tsx (Server Component)
<ProductGrid products={products}>     ← server, fetches data
  <ProductCard product={product}>     ← server, renders markup
    <ShortlistButton id={product.id} isShortlisted={product.is_shortlisted} />  ← client
  </ProductCard>
</ProductGrid>

// Bad: entire page is client because one button needs onClick
'use client'  // ← unnecessary, pushes everything to client
export default function ListPage() { ... }
```

### Component composition over prop explosion

Prefer compound components and children over components with 15+ props. See `04-frontend-architecture.md` for the `ProductCard` example.

### No barrel exports

Don't create `index.ts` files that re-export everything from a directory. They hurt tree-shaking, cause circular dependency issues, and make it harder to find where things are defined. Import directly from the source file.

```typescript
// Bad
import { ProductCard, ProductGrid, ProductActions } from '@/components/products'

// Good
import { ProductCard } from '@/components/products/product-card'
import { ProductGrid } from '@/components/products/product-grid'
```

### Colocation

Keep related files together. A component's test, types, and styles (if any) live next to the component, not in a separate `__tests__/` or `types/` tree.

```
components/products/
  product-card.tsx
  product-card.test.tsx
  product-card-skeleton.tsx
```

### Data fetching

- **Server Components** fetch data directly with the Supabase server client. No `useEffect` + `fetch`.
- **Client Components** do NOT fetch data. They receive data as props from Server Component parents. The only exception: Realtime subscriptions (which update existing data, not initial fetch).
- **Mutations** go through Server Actions, never direct Supabase calls from client components.

### Loading states

Every data-dependent component has a matching Skeleton component. Skeletons match the real layout exactly — same dimensions, same spacing. No layout shift on data arrival.

Use `loading.tsx` files in route segments for page-level Suspense boundaries. Use inline `<Suspense fallback={<Skeleton />}>` for component-level boundaries.

---

## Tailwind & Styling

### Semantic tokens, not raw colors

Always use semantic color tokens. Never hardcode hex values or Tailwind color names directly.

```tsx
// Bad
<div className="bg-zinc-900 text-white border-zinc-700">
<div className="text-purple-500">  {/* AI content */}

// Good
<div className="bg-card text-card-foreground border-border">
<div className="text-ai-accent">  {/* AI content */}
```

The full token list is in `04-frontend-architecture.md`. ShopIt-specific tokens: `--shortlisted`, `--purchased`, `--ai-accent`, `--extraction-pending`.

### Class ordering

Follow a consistent ordering within `className` strings. Not enforced by tooling, but aim for:

1. Layout (`flex`, `grid`, `block`, `absolute`, `fixed`)
2. Sizing (`w-`, `h-`, `min-w-`, `max-w-`)
3. Spacing (`p-`, `m-`, `gap-`)
4. Typography (`text-`, `font-`, `leading-`, `tracking-`)
5. Visual (`bg-`, `border-`, `rounded-`, `shadow-`)
6. States (`hover:`, `focus:`, `active:`, `disabled:`)
7. Responsive (`sm:`, `md:`, `lg:`, `xl:`)
8. Animation (`transition-`, `animate-`, `duration-`)

Use `cn()` (from `lib/utils.ts`) for conditional classes. Never string concatenation.

```typescript
// Good
<div className={cn(
  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
  'hover:bg-accent/50 transition-colors',
  isActive && 'bg-accent text-accent-foreground font-medium'
)}>

// Bad
<div className={`flex items-center ${isActive ? 'bg-accent' : ''}`}>
```

### No inline styles

Exception: dynamic values that can't be expressed as Tailwind classes (e.g., a width from a calculation). Even then, prefer CSS variables set via `style` + consumed by Tailwind.

### Responsive: mobile-first

Always start with the mobile layout, then add breakpoints going up. Never write desktop-first and then `max-sm:` to fix mobile.

```tsx
// Good: mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Bad: desktop-first, then overriding
<div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
```

---

## Server Actions & API Routes

### ActionResult pattern

Every Server Action returns `ActionResult<T>`. No exceptions. No throwing errors. See `07-api-contracts.md` for the full type and all Zod schemas.

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError }
```

### Action structure

Every Server Action follows this order:

1. **Authenticate** — get the user from cookies. Return `UNAUTHORIZED` if not logged in.
2. **Validate** — parse input with the Zod schema. Return `VALIDATION_ERROR` with `field` on failure.
3. **Authorize** — check list membership and role (defense in depth over RLS). Return `FORBIDDEN` if insufficient role.
4. **Execute** — run the Supabase query.
5. **Revalidate** — call `revalidatePath()` for affected routes.
6. **Return** — `{ success: true, data: ... }`.

### Error handling in actions

Wrap the execute step in try/catch. Catch Supabase errors and map to our error codes. Never expose raw database errors to the client.

```typescript
try {
  const { data, error } = await supabase.from('lists').insert(...)
  if (error) throw error
  return { success: true, data: { id: data.id } }
} catch (err) {
  console.error('createList failed:', err)
  return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create list' } }
}
```

### API route responses

API routes (just the expert opinion endpoint for now) use the same `ActionResult` envelope but return proper HTTP status codes:

| Code | When |
|------|------|
| 200 | Success |
| 401 | Not authenticated |
| 403 | Authenticated but insufficient role |
| 404 | Resource not found |
| 422 | Validation error (e.g., fewer than 2 products) |
| 500 | Internal / AI error |

---

## Supabase

### Client usage

Three clients, three contexts. Never use the wrong one.

| Client | File | Use in | RLS |
|--------|------|--------|-----|
| `createServerClient()` | `lib/supabase/server.ts` | Server Components, Server Actions | Yes — uses user's session cookies |
| `createBrowserClient()` | `lib/supabase/client.ts` | Client Components (Realtime only) | Yes — uses user's session |
| `createAdminClient()` | `lib/supabase/admin.ts` | API routes, Edge Functions | No — service role, bypasses RLS |

**Rule:** Never import the admin client in a Server Action. Server Actions use the session-based client so RLS is enforced. The admin client is only for AI-generated writes (expert opinion) and the ingestion Edge Function.

### Query style

Use the Supabase query builder, not raw SQL (unless you need something the builder can't express).

```typescript
// Good
const { data, error } = await supabase
  .from('products')
  .select('id, title, price_min, is_shortlisted')
  .eq('list_id', listId)
  .is('archived_at', null)
  .order('position', { ascending: true })

// Avoid unless necessary
const { data, error } = await supabase.rpc('some_complex_function', { ... })
```

### Migrations

SQL migrations live in `supabase/migrations/`. Each migration is a single file with a timestamp prefix. Migrations are additive — never edit a committed migration. To change something, write a new migration.

Name migrations descriptively: `20260322_create_products_table.sql`, `20260323_add_rls_policies.sql`.

---

## Testing

### TDD cycle

We follow red-green-refactor. Write the test first, watch it fail, make it pass, clean up. This isn't optional — it's how we build confidence in a codebase that mixes Server Actions, Realtime, and AI.

### Test file location

Tests live next to the code they test. Same directory, `.test.ts` or `.test.tsx` suffix.

```
lib/actions/lists.ts
lib/actions/lists.test.ts

components/products/product-card.tsx
components/products/product-card.test.tsx
```

### What to test

| Layer | What to test | Example |
|-------|-------------|---------|
| **Zod schemas** | Valid input passes, invalid input fails with correct error message and path | `createListSchema.safeParse({ name: '' })` → error on `name` |
| **Server Actions** | Input validation, auth check (returns UNAUTHORIZED), role check (returns FORBIDDEN), success return shape, error cases | `createList({})` without auth → `UNAUTHORIZED` |
| **API routes** | Request validation, response shape, HTTP status codes | `POST /api/.../expert-opinion` with < 2 products → 422 |
| **Components** | Renders with props, handles interactions, shows loading/error states | `<ProductCard>` renders title, click fires handler |
| **Hooks** | Subscription setup, state updates, cleanup | `useRealtimeProducts` subscribes on mount, unsubscribes on unmount |
| **Utilities** | Pure functions: formatters, parsers, helpers | `formatPrice(29999, 'INR')` → `₹29,999` |

### What NOT to test

- CSS classes or styling (visual regression is a different concern)
- Third-party library internals (shadcn renders correctly, Framer Motion animates)
- Supabase RLS policies directly (test via integration through Server Actions)
- Implementation details (don't test that a component uses `useState` internally)

### Test naming

```typescript
describe('createList', () => {
  it('returns UNAUTHORIZED when user is not logged in', ...)
  it('returns VALIDATION_ERROR when name is empty', ...)
  it('creates list and owner membership on valid input', ...)
  it('returns VALIDATION_ERROR when budget_min > budget_max', ...)
})
```

Name tests by behavior, not implementation. "returns X when Y" > "calls supabase.insert".

---

## Error Handling

### User-facing errors

All errors shown to users come from `ActionError.message`. These are short, human-readable sentences. Never expose stack traces, database errors, or internal codes.

```typescript
// Good
{ code: 'NOT_FOUND', message: 'This list was deleted or you lost access' }

// Bad
{ code: 'NOT_FOUND', message: 'Error: relation "public.lists" does not contain row with id ...' }
```

### Logging

Use `console.error()` for unexpected errors in Server Actions and API routes. Include the action name and relevant IDs (list, product, user) but never log full user data or tokens.

```typescript
console.error(`[createList] Failed for user ${userId}:`, error)
```

### AI errors

AI calls (Gemini) can fail in three ways:

1. **Network/rate limit** — retry once after 1s. If still failing, return `AI_ERROR`.
2. **Malformed response** — Gemini returned JSON that doesn't match our schema. Log the raw response, return `AI_ERROR`.
3. **Content filter** — Gemini refused to process. Return `AI_ERROR` with a generic message.

Never block the user flow on AI failure. The hype title falls back to an empty name field. The extraction marks the product as `failed` with a retry button. The expert opinion shows an error state with "Try again."

---

## Git

### Commit messages

Short imperative subject line (≤ 72 chars). Body explains *why*, not *what* (the diff shows what).

```
Add shortlist toggle with optimistic UI

Server Action validates editor+ role before toggling.
Client updates immediately via useOptimistic, reverts on failure.
```

### Branch naming

Feature branches: `feat/short-description`
Bug fixes: `fix/short-description`
Refactors: `refactor/short-description`

### PR size

Keep PRs focused. One feature, one fix, or one refactor per PR. If a PR touches more than 10 files or 500 lines, consider splitting it.

---

## Accessibility

These aren't optional — they're part of "done."

- Every interactive element is keyboard-accessible. Tab order is logical.
- Every image has an `alt` attribute (empty `alt=""` for decorative images).
- Every form input has a `<Label>` with `htmlFor`.
- Color is never the only way to convey information (pair with icons or text).
- Focus rings are visible in both light and dark mode.
- `aria-live` regions announce dynamic content changes (AI title generation, Realtime updates, toast messages).
- All page specs in `docs/system-guide/06*` include detailed accessibility sections — follow them.
- Test with keyboard-only navigation. If you can't complete a flow without a mouse, it's a bug.

---

## Performance

- **No client-side data fetching waterfalls.** Data is fetched in Server Components and passed down. Parallel fetches where possible (`Promise.all`).
- **No unnecessary re-renders.** Memoize expensive computations. Keep client component trees small.
- **Images use `next/image`** with proper `width`/`height` to prevent layout shift. Product images from external URLs use `remotePatterns` in `next.config.js`.
- **Bundle size matters.** Import specifically, not entire libraries. `import { Button } from '@/components/ui/button'`, not `import * as UI from '@/components/ui'`.
- **Realtime subscriptions are scoped.** Subscribe to one list's products, not all products. Unsubscribe on unmount.

---

## Code Review Checklist

Before marking a PR as ready:

- [ ] Tests pass (including the ones you just wrote)
- [ ] No `any` types added
- [ ] Server Actions return `ActionResult<T>`
- [ ] Zod schemas validate all inputs
- [ ] No raw color values — semantic tokens only
- [ ] Accessible (keyboard, labels, aria attributes)
- [ ] Loading/error states handled
- [ ] Dark mode works (check both themes)
- [ ] Mobile layout works (check at 375px width)
- [ ] System guide docs updated if behavior changed

---
