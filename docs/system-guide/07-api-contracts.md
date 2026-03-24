# ShopIt — API & Server Action Contracts

Type-safe contracts for every Server Action and API route. This spec defines input/output schemas, error handling conventions, and the standard patterns that every endpoint follows.

> **Note:** This is the integration contract between frontend and backend. For high-level architecture (why Server Actions vs API routes vs Edge Functions), see [03-backend-architecture.md](./03-backend-architecture.md). For the database schema these contracts read/write, see [02-data-model.md](./02-data-model.md).

---

## Conventions

### 1. Response Envelope

Every Server Action and API route returns the same shape:

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError }

type ActionError = {
  code: ErrorCode
  message: string          // human-readable, safe to display in UI
  field?: string           // for validation errors — which field failed
  details?: unknown        // optional structured context (never PII)
}
```

**Why a discriminated union instead of try/catch?**
Server Actions can't throw errors that the client catches cleanly. Next.js serializes thrown errors as generic strings. A `{ success, data/error }` envelope gives the client type-safe error handling without try/catch gymnastics.

### 2. Error Codes

Consistent error codes across all endpoints. The frontend maps these to UI behavior.

```typescript
type ErrorCode =
  | 'VALIDATION_ERROR'     // Zod validation failed — check error.field
  | 'NOT_FOUND'            // Resource doesn't exist or user can't see it (RLS)
  | 'UNAUTHORIZED'         // Not logged in
  | 'FORBIDDEN'            // Logged in but wrong role (e.g., viewer trying to edit)
  | 'CONFLICT'             // Duplicate (e.g., inviting an existing member)
  | 'RATE_LIMITED'         // Too many requests (future-proofing)
  | 'AI_ERROR'             // Gemini call failed
  | 'SCRAPING_ERROR'       // Firecrawl call failed
  | 'INTERNAL_ERROR'       // Unexpected server error
```

**Frontend error handling pattern:**
```typescript
const result = await createList(formData)
if (!result.success) {
  switch (result.error.code) {
    case 'VALIDATION_ERROR':
      // Set field-level error: form.setError(result.error.field, result.error.message)
      break
    case 'UNAUTHORIZED':
      // Redirect to login
      break
    default:
      // Show toast: toast.error(result.error.message)
  }
}
```

### 3. Validation with Zod

Every input is validated with Zod. Schemas live in `lib/validators/` and are shared between client (form validation) and server (action validation).

```
lib/validators/
  lists.ts       — createListSchema, updateListSchema
  products.ts    — addProductSchema, updateProductSchema
  members.ts     — inviteMemberSchema, updateRoleSchema
  comments.ts    — createCommentSchema, updateCommentSchema
```

**Pattern inside every Server Action:**
```typescript
'use server'

export async function createList(input: unknown): Promise<ActionResult<List>> {
  // 1. Auth
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Please sign in' } }

  // 2. Validate
  const parsed = createListSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstError.message,
        field: firstError.path.join('.')
      }
    }
  }

  // 3. Authorize (if needed beyond RLS)
  // 4. Execute query
  // 5. Revalidate + return
}
```

### 4. Optimistic UI Convention

Server Actions that support optimistic updates accept an optional `optimisticId` from the client. The client generates a temporary UUID, renders the optimistic item, and replaces it when the server responds with the real ID.

```typescript
// Client
const optimisticId = crypto.randomUUID()
startTransition(() => {
  setOptimisticItems(prev => [...prev, { id: optimisticId, ...newItem }])
})
const result = await addProduct({ ...input, optimisticId })
// On success: real item replaces optimistic one via revalidation
// On failure: remove optimistic item, show error toast
```

### 5. Revalidation Strategy

| Mutation | Revalidation |
|----------|-------------|
| List CRUD | `revalidatePath('/')` (dashboard) + `revalidatePath('/lists/[id]')` |
| Product CRUD | `revalidatePath('/lists/[id]')` |
| Member changes | `revalidatePath('/lists/[id]')` |
| Comment changes | None — Realtime handles it |
| Expert Opinion | `revalidatePath('/lists/[id]')` |

---

## Server Actions — Lists (`lib/actions/lists.ts`)

### `createList`

```typescript
// Input schema (lib/validators/lists.ts)
const createListSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  budget_min: z.number().positive().optional(),
  budget_max: z.number().positive().optional(),
  purchase_by: z.string().date().optional(),       // ISO date string, must be >= today
}).refine(
  (d) => !d.budget_min || !d.budget_max || d.budget_min <= d.budget_max,
  { message: 'Min budget must be less than max', path: ['budget_min'] }
)

// Return
ActionResult<{
  id: string           // new list UUID
  name: string
}>

// Side effects
// - Inserts list row
// - Inserts list_members row with role='owner' for current user
// - revalidatePath('/')
```

### `updateList`

```typescript
const updateListSchema = z.object({
  listId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  budget_min: z.number().positive().nullable().optional(),
  budget_max: z.number().positive().nullable().optional(),
  purchase_by: z.string().date().nullable().optional(),
  priorities: z.array(z.string().max(100)).max(10).optional(),
  ai_title_edited: z.boolean().optional(),
})

// Return
ActionResult<{ id: string }>

// Auth: owner or editor
// Side effects: revalidatePath('/'), revalidatePath('/lists/[id]')
```

### `archiveList`

```typescript
const archiveListSchema = z.object({
  listId: z.string().uuid(),
})

// Return
ActionResult<{ id: string }>

// Auth: owner only
// Side effects: sets archived_at = now(), status = 'archived'
// Revalidates: '/', '/lists/[id]'
```

---

## Server Actions — Products (`lib/actions/products.ts`)

### `addProduct`

```typescript
const addProductSchema = z.object({
  listId: z.string().uuid(),
  url: z.string().url().max(2048),
  notes: z.string().max(2000).optional(),
})

// Return
ActionResult<{
  id: string                // new product UUID
  extraction_status: 'pending'
}>

// Auth: editor+ on the list
// Side effects:
// - Extracts domain from URL
// - Inserts product row with extraction_status='pending'
// - DB webhook fires → Edge Function starts scraping
// - revalidatePath('/lists/[id]')
```

### `updateProduct`

```typescript
const updateProductSchema = z.object({
  productId: z.string().uuid(),
  notes: z.string().max(2000).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

// Return
ActionResult<{ id: string }>

// Auth: editor+ on the product's list
// Note: AI-extracted fields (title, specs, etc.) are NOT user-editable.
//       Only user-owned fields (notes, position) can be updated.
```

### `toggleShortlist`

```typescript
const toggleShortlistSchema = z.object({
  productId: z.string().uuid(),
  isShortlisted: z.boolean(),
})

// Return
ActionResult<{ id: string; isShortlisted: boolean }>

// Auth: editor+ on the product's list
// Optimistic UI: yes — client toggles immediately
// Side effects: revalidatePath('/lists/[id]')
```

### `markPurchased`

```typescript
const markPurchasedSchema = z.object({
  productId: z.string().uuid(),
  isPurchased: z.boolean(),
  purchasedPrice: z.number().positive().optional(),
  purchaseUrl: z.string().url().optional(),
})

// Return
ActionResult<{ id: string; isPurchased: boolean }>

// Auth: editor+ on the product's list
// Side effects:
// - If isPurchased=true: sets purchased_at=now()
// - If isPurchased=false: clears purchased_at, purchased_price, purchase_url
// - revalidatePath('/lists/[id]')
```

### `archiveProduct`

```typescript
const archiveProductSchema = z.object({
  productId: z.string().uuid(),
})

// Return
ActionResult<{ id: string }>

// Auth: editor+ on the product's list
// Side effects: sets archived_at=now(), revalidatePath('/lists/[id]')
```

### `retryExtraction`

```typescript
const retryExtractionSchema = z.object({
  productId: z.string().uuid(),
})

// Return
ActionResult<{ id: string; extraction_status: 'pending' }>

// Auth: editor+ on the product's list
// Pre-condition: extraction_status must be 'failed'
// Side effects:
// - Resets extraction_status='pending', clears extraction_error
// - DB webhook fires again → Edge Function re-processes
// - If raw_scraped_data exists, Edge Function skips scraping step
```

---

## Server Actions — Members (`lib/actions/members.ts`)

### `inviteMember`

```typescript
const inviteMemberSchema = z.object({
  listId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']),       // can't invite as owner
})

// Return
ActionResult<{
  id: string             // list_members row ID
  status: 'invited'
}>

// Auth: owner only
// Error cases:
// - CONFLICT if email is already a member (joined or pending)
// - VALIDATION_ERROR if inviting self
// Side effects:
// - Inserts list_members row with joined_at=null (pending)
// - Triggers invite email (Supabase Auth hook or Edge Function)
// - revalidatePath('/lists/[id]')
```

### `removeMember`

```typescript
const removeMemberSchema = z.object({
  listId: z.string().uuid(),
  memberId: z.string().uuid(),         // list_members.id, NOT user_id
})

// Return
ActionResult<{ id: string }>

// Auth: owner only (can't remove self — must archive list instead)
// Side effects: deletes list_members row, revalidatePath('/lists/[id]')
```

### `updateRole`

```typescript
const updateRoleSchema = z.object({
  listId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(['owner', 'editor', 'viewer']),
})

// Return
ActionResult<{ id: string; role: string }>

// Auth: owner only
// Note: promoting to owner does NOT demote current owner
//       (a list can have multiple owners)
```

### `acceptInvite`

```typescript
const acceptInviteSchema = z.object({
  listId: z.string().uuid(),
})

// Return
ActionResult<{ id: string; role: string }>

// Auth: the invited user (matched by auth email to pending list_members row)
// Side effects: sets joined_at=now()
// Note: typically called automatically when invitee clicks magic link,
//       not via a manual UI button
```

### `resendInvite`

```typescript
const resendInviteSchema = z.object({
  memberId: z.string().uuid(),
})

// Return
ActionResult<{ id: string }>

// Auth: owner only
// Pre-condition: member must be pending (joined_at is null)
// Rate limit: 1 resend per member per 60 seconds (enforced client-side + server-side)
```

---

## Server Actions — Comments (`lib/actions/comments.ts`)

### `addComment`

```typescript
const createCommentSchema = z.object({
  productId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),    // for replies
})

// Return
ActionResult<{
  id: string
  content: string
  createdAt: string      // ISO timestamp
}>

// Auth: editor+ on the product's list (viewers can't comment)
// Optimistic UI: yes — comment appears immediately in thread
// Side effects: no revalidation needed — Realtime pushes to all clients
```

### `updateComment`

```typescript
const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z.string().min(1).max(5000),
})

// Return
ActionResult<{ id: string }>

// Auth: comment author only
```

### `deleteComment`

```typescript
const deleteCommentSchema = z.object({
  commentId: z.string().uuid(),
})

// Return
ActionResult<{ id: string }>

// Auth: comment author OR list owner
// Side effects: cascade deletes child replies (via FK)
```

---

## Server Actions — AI (`lib/actions/ai.ts`)

### `generateHypeTitle`

```typescript
const generateHypeTitleSchema = z.object({
  category: z.string().min(1).max(200),
})

// Return
ActionResult<{
  title: string          // e.g., "The Great TV Showdown"
}>

// Auth: any authenticated user
// Implementation: single Gemini Flash call, no DB write
// Latency: ~200-400ms (Gemini Flash)
// Error handling: on AI_ERROR, client falls back to user typing a name manually
// No revalidation — this is a pure function, no side effects
```

---

## API Routes

### `POST /api/lists/[listId]/expert-opinion`

The only API route in v1. Uses an API route instead of a Server Action because:
- Gemini call with full product context takes 3-10s
- Needs structured streaming (future) and progress indication
- Returns a large structured response that benefits from HTTP semantics

```typescript
// Request
POST /api/lists/:listId/expert-opinion
Authorization: Bearer <supabase-session-cookie>   // handled by middleware
Content-Type: application/json
Body: {}                                           // no input needed — reads list context

// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "uuid",
    "top_pick": "product-uuid",
    "top_pick_reason": "Best combination of picture quality and price...",
    "value_pick": "product-uuid",
    "value_pick_reason": "At ₹28,999, this delivers 90% of the performance...",
    "summary": "Based on your 4 options, the LG C3 stands out...",
    "comparison": "Detailed prose comparing all products...",
    "concerns": "The Samsung lacks Dolby Vision support, which...",
    "verdict": "Go with the LG C3 if budget allows. Fall back to...",
    "product_count": 4,
    "generated_at": "2026-03-22T10:30:00Z",
    "model_version": "gemini-3.1-flash-lite-preview"
  }
}

// Error responses
// 401: { success: false, error: { code: "UNAUTHORIZED", message: "..." } }
// 403: { success: false, error: { code: "FORBIDDEN", message: "..." } }
// 404: { success: false, error: { code: "NOT_FOUND", message: "List not found" } }
// 422: { success: false, error: { code: "VALIDATION_ERROR", message: "Need at least 2 products" } }
// 500: { success: false, error: { code: "AI_ERROR", message: "Failed to generate opinion" } }

// Implementation notes:
// - Requires at least 2 non-archived products with extraction_status='completed'
// - Uses service_role client to upsert list_ai_opinions (AI writes bypass RLS)
// - Upserts — creates on first call, updates on subsequent calls
// - Revalidates '/lists/[id]' on success
```

---

## Edge Function — Ingestion Worker (`supabase/functions/ingest-product`)

Not called by the frontend directly — triggered by a Supabase Database Webhook on `INSERT` into `products` where `extraction_status = 'pending'`.

```typescript
// Webhook payload (from Supabase)
{
  "type": "INSERT",
  "table": "products",
  "record": {
    "id": "product-uuid",
    "url": "https://www.amazon.in/dp/B0...",
    "domain": "amazon.in",
    "list_id": "list-uuid",
    "extraction_status": "pending",
    "raw_scraped_data": null          // null on first run, populated on retry
  }
}

// What the Edge Function writes to DB (via service_role client)
// Step 1: extraction_status → 'processing'
// Step 2: On success, updates product row:
{
  "title": "LG C3 55\" OLED TV",
  "brand": "LG",
  "model": "OLED55C3PSA",
  "image_url": "https://m.media-amazon.com/images/I/...",
  "price_min": 89990.00,
  "price_max": null,
  "currency": "INR",
  "price_note": "MRP ₹1,69,990 (47% off)",
  "specs": {
    "screen_size": "55\"",
    "resolution": "4K (3840x2160)",
    "panel_type": "OLED",
    "refresh_rate": "120Hz",
    "hdmi_ports": "4 (HDMI 2.1)",
    "smart_tv": "webOS"
  },
  "pros": [
    "Infinite contrast ratio (OLED blacks)",
    "Excellent gaming support (4K@120Hz, VRR)",
    "Dolby Vision + Dolby Atmos"
  ],
  "cons": [
    "Risk of burn-in with static content",
    "Brightness lower than QLED alternatives",
    "No HDR10+ support"
  ],
  "rating": 4.40,
  "review_count": 1247,
  "scraped_reviews": [
    {
      "snippet": "Best TV I've bought. Picture quality is unreal.",
      "rating": 5,
      "source": "Amazon.in"
    },
    {
      "snippet": "Good but worried about burn-in after 6 months.",
      "rating": 3,
      "source": "Amazon.in"
    }
  ],
  "ai_summary": "The LG C3 is a mid-range OLED that delivers flagship picture quality...",
  "ai_review_summary": "Reviewers consistently praise the picture quality and gaming features. Main concern is long-term burn-in risk, though LG's pixel-refresh technology has improved.",
  "ai_verdict": "Best picture quality under ₹1L",
  "ai_extracted_at": "2026-03-22T10:30:00Z",
  "raw_scraped_data": { /* full Firecrawl response */ },
  "extraction_status": "completed"
}

// Step 2 (alternative): On failure:
{
  "extraction_status": "failed",
  "extraction_error": "Firecrawl timeout: site blocked automated access"
}
```

**Retry behavior:** The Edge Function itself does not retry. If it fails, the product stays in `failed` state. The user clicks "Retry" in the UI → `retryExtraction` Server Action resets status to `pending` → DB webhook fires again.

**Re-extraction optimization:** If `raw_scraped_data` is already populated (retry scenario), the Edge Function skips the Firecrawl call and goes straight to Gemini extraction. This saves time and API costs.

---

## Zod Schema Reference

Complete Zod schemas in one place for quick reference. These live in `lib/validators/` and are imported by both Server Actions and form components.

```typescript
// lib/validators/lists.ts
export const createListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  budget_min: z.number().positive('Must be positive').optional(),
  budget_max: z.number().positive('Must be positive').optional(),
  purchase_by: z.string().date().optional(),
}).refine(
  (d) => !d.budget_min || !d.budget_max || d.budget_min <= d.budget_max,
  { message: 'Min budget must be ≤ max budget', path: ['budget_min'] }
)

export const updateListSchema = z.object({
  listId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  budget_min: z.number().positive().nullable().optional(),
  budget_max: z.number().positive().nullable().optional(),
  purchase_by: z.string().date().nullable().optional(),
  priorities: z.array(z.string().max(100)).max(10).optional(),
  ai_title_edited: z.boolean().optional(),
})

// lib/validators/products.ts
export const addProductSchema = z.object({
  listId: z.string().uuid(),
  url: z.string().url('Must be a valid URL').max(2048),
  notes: z.string().max(2000).optional(),
})

export const toggleShortlistSchema = z.object({
  productId: z.string().uuid(),
  isShortlisted: z.boolean(),
})

export const markPurchasedSchema = z.object({
  productId: z.string().uuid(),
  isPurchased: z.boolean(),
  purchasedPrice: z.number().positive().optional(),
  purchaseUrl: z.string().url().optional(),
})

// lib/validators/members.ts
export const inviteMemberSchema = z.object({
  listId: z.string().uuid(),
  email: z.string().email('Must be a valid email'),
  role: z.enum(['editor', 'viewer']),
})

export const updateRoleSchema = z.object({
  listId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(['owner', 'editor', 'viewer']),
})

// lib/validators/comments.ts
export const createCommentSchema = z.object({
  productId: z.string().uuid(),
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
  parentId: z.string().uuid().optional(),
})

export const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  content: z.string().min(1).max(5000),
})

// lib/validators/ai.ts
export const generateHypeTitleSchema = z.object({
  category: z.string().min(1).max(200),
})
```

---

## Auth Middleware (`middleware.ts`)

Not an API contract per se, but critical context for how auth works across all endpoints.

```typescript
// Runs on every request
// 1. Refreshes Supabase session (extends cookie expiry)
// 2. Redirects unauthenticated users:
//    - /lists/*, /profile/* → redirect to /login
//    - /api/* → return 401 JSON response
//    - /login, /auth/* → allow through (public routes)
// 3. Redirects authenticated users:
//    - /login → redirect to / (already logged in)

// matcher config
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

---

## Realtime Subscriptions (Client-Side)

Not Server Actions, but part of the data contract. These are the Supabase Realtime channels the frontend subscribes to.

```typescript
// hook: useRealtimeProducts(listId)
// Channel: `list-products-${listId}`
// Listens: postgres_changes on products table, filter: list_id=eq.${listId}
// Events: INSERT, UPDATE, DELETE
// Payload shape: { new: Product, old: Product, eventType: string }
// UI effect: updates product list in real-time (extraction progress, collaborator changes)

// hook: useRealtimeComments(productId)
// Channel: `product-comments-${productId}`
// Listens: postgres_changes on comments table, filter: product_id=eq.${productId}
// Events: INSERT, UPDATE, DELETE
// Payload shape: { new: Comment, old: Comment, eventType: string }
// UI effect: adds/updates/removes comments in the thread without refetch

// hook: useRealtimeMembers(listId)
// Channel: `list-members-${listId}`
// Listens: postgres_changes on list_members table, filter: list_id=eq.${listId}
// Events: INSERT, UPDATE, DELETE
// Payload shape: { new: ListMember, old: ListMember, eventType: string }
// UI effect: updates member list (new join, role change, removal)
```

---
