# Phase 5: Lists CRUD & Dashboard

## Checklist

- [x] Build Server Actions: `createList`, `updateList`, `archiveList` (`lib/actions/lists.ts`)
- [ ] Write tests for list Server Actions
- [x] Build Dashboard page (`app/(app)/page.tsx`) — fetches memberships + product stats server-side
- [x] Build list card component (`components/lists/list-card.tsx`) — uses AI emoji with fallback
- [x] Build empty state component (`components/common/empty-state.tsx`)
- [x] Build Create List dialog (`components/lists/create-list-dialog.tsx`) — with AI title placeholder state for Phase 9
- [x] Build dashboard content wrapper (`components/lists/dashboard-content.tsx`) — grid + create dialog + dashed new-list card
- [ ] Build flashlight hover effect on card grid
- [ ] Build view toggle (grid/list) with URL state via `nuqs`
- [x] Wire sidebar nav to real list data (layout fetches `category_emoji`)
- [x] Wire command palette to list search
- [x] Add `category_emoji` column to lists table + `getCategoryEmoji` fallback utility
- [x] Add `pgcrypto` extension for `gen_random_bytes` in invite_tokens
- [x] Fix RLS: `lists_select` allows owner direct access (avoids chicken-and-egg with list_members)
- [x] Fix RLS: `list_members` policies use `SECURITY DEFINER` helper functions to avoid infinite recursion
- [x] Add dev password login for development (hidden in production)
- [ ] Test: create a list → appears on dashboard + sidebar
- [ ] Test: archive a list → disappears from dashboard
- [ ] Test: empty state shows when no lists
- **Note:** List detail page (`/lists/[listId]`) not yet built — that's Phase 6.

---

## Step 1: List Server Actions

File: `lib/actions/lists.ts`

Implement the three actions from `07-api-contracts.md`:

### `createList`
```
1. getAuthenticatedUser() → UNAUTHORIZED if null
2. createListSchema.safeParse(input) → VALIDATION_ERROR if invalid
3. Insert into public.lists with owner_id = user.id
4. Insert into public.list_members with role='owner', user_id = user.id
5. revalidatePath('/')
6. Return { success: true, data: { id, name } }
```

### `updateList`
```
1. Auth check
2. updateListSchema.safeParse(input)
3. Verify user is editor+ on this list (query list_members)
4. Update the list row
5. revalidatePath('/'), revalidatePath(`/lists/${listId}`)
6. Return { success: true, data: { id } }
```

### `archiveList`
```
1. Auth check
2. Verify user is owner
3. Set archived_at = now(), status = 'archived'
4. revalidatePath('/'), revalidatePath(`/lists/${listId}`)
5. Return { success: true, data: { id } }
```

## Step 2: Tests for List Actions

File: `lib/actions/lists.test.ts`

Follow the TDD pattern from `08-standards.md`:

```
describe('createList')
  it('returns UNAUTHORIZED when not logged in')
  it('returns VALIDATION_ERROR when name is empty')
  it('creates list and owner membership on valid input')
  it('returns the new list id and name')

describe('updateList')
  it('returns FORBIDDEN when user is a viewer')
  it('updates name when user is editor')
  it('returns VALIDATION_ERROR when budget_min > budget_max')

describe('archiveList')
  it('returns FORBIDDEN when user is not owner')
  it('sets archived_at and status to archived')
```

> **Note:** For testing Server Actions that depend on Supabase, you'll need to either:
> - Mock the Supabase client
> - Use a test Supabase project
> - Test the Zod validation layer separately (simpler, validates the contract)

## Step 3: Dashboard Page

File: `app/(app)/page.tsx` — Server Component

From `06-pages.md` — Page 2: Dashboard.

### Data Fetching (Server Component)
```typescript
// Fetch lists where user is a member (RLS handles access)
const { data: lists } = await supabase
  .from('lists')
  .select(`
    *,
    list_members!inner(user_id, role),
    products(id, is_shortlisted, is_purchased)
  `)
  .is('archived_at', null)
  .eq('list_members.user_id', user.id)
  .order('updated_at', { ascending: false })
```

### Layout
```
- Page header: "Your Lists" + view toggle + "+ New List" button
- Card grid: responsive 1/2/3 columns (mobile/tablet/desktop)
- "+ New List" dashed card at the end
- Empty state if no lists
```

### View Toggle
Use `nuqs` for URL-persisted view mode:
```typescript
const [view, setView] = useQueryState('view', { defaultValue: 'grid' })
```

## Step 4: List Card Component

File: `components/lists/list-card.tsx` — Server Component (no interactivity needed on the card itself; clicking navigates)

From `06-pages.md` element breakdown:

### Props
```typescript
type ListCardProps = {
  list: List & {
    productCount: number
    shortlistedCount: number
    purchasedCount: number
    memberCount: number
    members: Pick<Profile, 'id' | 'name' | 'avatar_url'>[]
  }
}
```

### Elements
1. Category emoji (auto-assigned or from category)
2. AI hype title (`list.name`) with `✨` if `!ai_title_edited`
3. Stats row: product count, shortlisted count, purchased count
4. AI comment bubble (`list.ai_comment`) with `🤖` prefix, `border-l-2 border-ai-accent`
5. Member avatar stack (overlapping circles)
6. Status badge: "Purchased" (green) / "Deciding" (amber) / "Researching" (default)
7. Click → `router.push(`/lists/${list.id}`)`

## Step 5: Flashlight Hover Effect

File: part of the dashboard page or a wrapper component

From `06-pages.md` animation spec:

```
- Track cursor position via onMouseMove on the grid container
- Set CSS custom properties --mouse-x, --mouse-y
- Radial gradient overlay follows cursor
- Only affects card borders (not fill)
- 600px radius, hsl(var(--ai-accent) / 0.06)
- Desktop only (disable on mobile — no hover on touch)
```

Implementation: a `<div>` overlay on the grid with `pointer-events-none` and the gradient background.

## Step 6: Empty State

File: `components/common/empty-state.tsx`

From `06-pages.md` empty state layout:

```
- 📦 icon or illustration
- "No lists yet"
- "Start your first purchase decision"
- CTA button: "+ Create a List"
- Fun AI quip: "What are we buying today?" — ShopIt AI
```

## Step 7: Create List Dialog

File: `components/lists/create-list-dialog.tsx` — `'use client'`

From `06c-list-creation-flow.md`. This is a key interaction — read the full spec.

### Desktop: `<Dialog>`, Mobile: `<Sheet side="bottom">`

Use a responsive pattern:
```typescript
const isMobile = useMediaQuery('(max-width: 640px)')
// Render <Sheet> on mobile, <Dialog> on desktop
```

### Elements
1. Title: "Create a new list"
2. Category input: "What are you shopping for?" with debounced AI title generation
3. AI title display: sparkle icon + typewriter animation
4. List name input: pre-filled with AI title, editable
5. Collapsible "Optional details": description textarea, budget range (two number inputs), purchase-by date picker
6. Create button with loading/success/error states

### AI Title Generation (placeholder — wired in Phase 9)

The dialog **must** include the state and UI hooks for AI title display now, even though the actual `generateHypeTitle` Server Action is implemented in Phase 9. Build:

1. **State:** `aiTitle: string | null`, `aiTitleLoading: boolean`
2. **UI slot:** Below category input — shows skeleton when loading, typewriter text when loaded, empty when idle
3. **Debounce hook:** 300ms after category input stops, calls a stub function
4. **Stub:** For now, the stub does nothing (returns immediately). Phase 9 replaces it with the real Gemini call.
5. **Name input:** Pre-fills with `aiTitle` when it arrives, but allows manual editing

This ensures Phase 9 only needs to swap the stub — no restructuring of the dialog component.

### Form Submission
```typescript
const result = await createList({
  name: listName || category,
  category,
  description,
  budget_min: budgetMin || undefined,
  budget_max: budgetMax || undefined,
  purchase_by: purchaseBy || undefined,
})

if (result.success) {
  // Success animation (400ms) → close dialog → router.push(`/lists/${result.data.id}`)
}
```

## Step 8: Wire Sidebar to Real Data

Update `app/(app)/layout.tsx` to fetch the user's lists and pass them to the Sidebar component.

```typescript
// In the layout Server Component:
const { data: lists } = await supabase
  .from('list_members')
  .select('role, lists(id, name, category)')
  .eq('user_id', user.id)
  .is('lists.archived_at', null)

// Split into owned vs shared
const ownedLists = lists.filter(m => m.role === 'owner')
const sharedLists = lists.filter(m => m.role !== 'owner')

// Pass to Sidebar
<Sidebar ownedLists={ownedLists} sharedLists={sharedLists} />
```

## Step 9: Wire Command Palette

Update `components/common/command-menu.tsx` to search lists by name.

```typescript
// Receive lists as props (from layout)
// Filter by search query
// "Create New List" action opens the Create List dialog
```

## Test Checkpoint

1. **Create a list:** Click "+ New List" → dialog opens → enter category → create → redirects to new list page (which will be empty for now, just show `/lists/[id]`)
2. **Dashboard:** Multiple lists appear as cards in the grid
3. **Sidebar:** Lists appear in sidebar nav, click navigates to list
4. **Empty state:** New user sees empty state with CTA
5. **View toggle:** Grid/list toggle works and persists in URL
6. **Flashlight effect:** Move mouse over cards on desktop — border glow follows cursor
7. **Dark mode:** Cards look correct in both themes
8. **Mobile:** Cards stack to single column, bottom tabs work
