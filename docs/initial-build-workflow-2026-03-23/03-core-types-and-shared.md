# Phase 3: Core Types & Shared Code

## Checklist

- [ ] Define TypeScript types for all database entities
- [ ] Create ActionResult type and error codes
- [ ] Create all Zod validation schemas
- [ ] Create shared utility functions (formatPrice, extractDomain, etc.)
- [ ] Create constants file
- [ ] Write tests for Zod schemas
- [ ] Write tests for utility functions

---

## Step 1: Database Entity Types

File: `lib/types/database.ts`

Define TypeScript types that mirror the Postgres schema from `02-data-model.md`. These are the shapes returned by Supabase queries.

```typescript
type Profile = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  context: Record<string, unknown>
  created_at: string
  updated_at: string
}

type List = {
  id: string
  name: string
  description: string | null
  category: string | null
  status: 'active' | 'archived'
  budget_min: number | null
  budget_max: number | null
  purchase_by: string | null
  priorities: string[]
  ai_comment: string | null
  ai_title_edited: boolean
  owner_id: string
  created_at: string
  updated_at: string
  archived_at: string | null
}

type ListMember = {
  id: string
  list_id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  invited_by: string | null
  joined_at: string | null       // null = pending invite
  created_at: string
}

type Product = {
  id: string
  list_id: string
  added_by: string | null
  added_via: 'user' | 'ai'
  url: string
  domain: string | null
  title: string | null
  image_url: string | null
  brand: string | null
  model: string | null
  price_min: number | null
  price_max: number | null
  currency: string
  price_note: string | null
  specs: Record<string, string>
  pros: string[]
  cons: string[]
  rating: number | null
  review_count: number | null
  scraped_reviews: ScrapedReview[]
  ai_summary: string | null
  ai_review_summary: string | null
  ai_verdict: string | null
  ai_extracted_at: string | null
  is_shortlisted: boolean
  is_purchased: boolean
  purchased_at: string | null
  purchased_price: number | null
  purchase_url: string | null
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed'
  raw_scraped_data: unknown | null
  extraction_error: string | null
  notes: string | null
  position: number
  created_at: string
  updated_at: string
  archived_at: string | null
}

type ScrapedReview = {
  snippet: string
  rating: number | null
  source: string | null
  date: string | null
}

type Comment = {
  id: string
  product_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  updated_at: string
}

type ListAiOpinion = {
  id: string
  list_id: string
  top_pick: string | null
  top_pick_reason: string | null
  value_pick: string | null
  value_pick_reason: string | null
  summary: string | null
  comparison: string | null
  concerns: string | null
  verdict: string | null
  product_count: number | null
  generated_at: string
  model_version: string | null
  created_at: string
  updated_at: string
}
```

## Step 2: ActionResult Type & Error Codes

File: `lib/types/actions.ts`

From `07-api-contracts.md`:

```typescript
type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'AI_ERROR'
  | 'SCRAPING_ERROR'
  | 'INTERNAL_ERROR'

type ActionError = {
  code: ErrorCode
  message: string
  field?: string
  details?: unknown
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError }
```

## Step 3: Zod Validation Schemas

Copy the complete schemas from `07-api-contracts.md` into the appropriate files:

### File: `lib/validators/lists.ts`
- `createListSchema` — name required, optional category/description/budget/date
- `updateListSchema` — listId required, all fields optional/nullable

### File: `lib/validators/products.ts`
- `addProductSchema` — listId + url required
- `updateProductSchema` — productId required
- `toggleShortlistSchema` — productId + boolean
- `markPurchasedSchema` — productId + boolean + optional price/url
- `archiveProductSchema` — productId
- `retryExtractionSchema` — productId

### File: `lib/validators/members.ts`
- `inviteMemberSchema` — listId + email + role
- `removeMemberSchema` — listId + memberId
- `updateRoleSchema` — listId + memberId + role
- `acceptInviteSchema` — listId
- `resendInviteSchema` — memberId

### File: `lib/validators/comments.ts`
- `createCommentSchema` — productId + content + optional parentId
- `updateCommentSchema` — commentId + content
- `deleteCommentSchema` — commentId

### File: `lib/validators/ai.ts`
- `generateHypeTitleSchema` — category

**Source of truth:** `docs/system-guide/07-api-contracts.md` — copy the Zod definitions verbatim.

## Step 4: Utility Functions

File: `lib/utils.ts` (extend the existing file)

```typescript
// Already exists: cn()

// Format price with currency
export function formatPrice(
  amount: number,
  currency: string = 'INR'
): string { ... }

// Format price range
export function formatPriceRange(
  min: number | null,
  max: number | null,
  currency: string = 'INR'
): string { ... }

// Extract domain from URL
export function extractDomain(url: string): string { ... }

// Relative time display ("2 hours ago", "just now")
export function relativeTime(date: string | Date): string { ... }
```

## Step 5: Constants

File: `lib/constants.ts`

```typescript
export const MAX_PRODUCTS_PER_LIST = 100
export const MAX_COMMENT_LENGTH = 5000
export const MAX_LIST_NAME_LENGTH = 200
export const MAX_PRIORITIES = 10
export const DEFAULT_CURRENCY = 'INR'
export const AI_TITLE_MAX_LENGTH = 30
export const AI_COMMENT_MAX_LENGTH = 60
export const INVITE_LINK_EXPIRY_DAYS = 7
export const RESEND_COOLDOWN_SECONDS = 60

export const EXTRACTION_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const
export const MEMBER_ROLES = ['owner', 'editor', 'viewer'] as const
export const LIST_STATUSES = ['active', 'archived'] as const

// Fallback AI comments when Gemini fails
export const FALLBACK_AI_COMMENTS = [
  'Ready when you are.',
  'The hunt begins.',
  'Decisions, decisions...',
  'Let the research commence.',
  'Your next great find awaits.',
] as const
```

## Step 6: Auth Helper

File: `lib/supabase/auth.ts`

Shared helper for Server Actions to get the current user:

```typescript
// getAuthenticatedUser()
// - Creates server Supabase client
// - Calls supabase.auth.getUser()
// - Returns user or null
// Used as the first step in every Server Action
```

## Step 7: AI Prompt File Structure (Skeleton)

File: `lib/ai/prompts.ts`

Create the file now with exported function stubs. All four prompt builders live in this one file — **never scatter prompt logic across action files**:

```typescript
// buildExtractionPrompt()     — Phase 6: product data extraction from scraped content
// buildHypeTitlePrompt()      — Phase 9: fun list title generation
// buildAiCommentPrompt()      — Phase 9: dynamic list comment bubble
// buildExpertOpinionPrompt()  — Phase 9: holistic product comparison
```

Also create: `lib/ai/gemini.ts` — shared Gemini API client wrapper with retry logic. Stub it now, implement in Phase 6.

## Step 8: Revalidation Strategy Reference

All Server Actions that mutate data must call `revalidatePath()`. The master reference for which paths to revalidate per action is in `docs/system-guide/07-api-contracts.md` § "Revalidation Strategy" (lines 121-129). Do not duplicate this table — reference it from each action file:

```typescript
// See docs/system-guide/07-api-contracts.md § Revalidation Strategy
// for which paths each action should revalidate.
```

## Test Checkpoint (TDD)

### Zod Schema Tests

File: `lib/validators/lists.test.ts` (and similar for each validator file)

Test cases per `08-standards.md` testing guidelines:

```
describe('createListSchema')
  it('passes with valid name only')
  it('passes with all optional fields')
  it('fails when name is empty')
  it('fails when name exceeds 200 chars')
  it('fails when budget_min > budget_max')
  it('passes when budget_min = budget_max')
  it('fails when purchase_by is in the past') // if we add this validation

describe('addProductSchema')
  it('passes with valid URL')
  it('fails with invalid URL')
  it('fails when URL exceeds 2048 chars')

describe('inviteMemberSchema')
  it('passes with valid email and role')
  it('fails with invalid email')
  it('fails with invalid role')
  it('does not allow inviting as owner')
```

### Utility Tests

File: `lib/utils.test.ts`

```
describe('formatPrice')
  it('formats INR correctly: 29999 → ₹29,999')
  it('handles zero')
  it('handles decimals')

describe('extractDomain')
  it('extracts domain from full URL: https://www.amazon.in/dp/xyz → amazon.in')
  it('strips www prefix')
  it('handles URLs without protocol')

describe('relativeTime')
  it('returns "just now" for < 1 minute')
  it('returns "2 hours ago" for 2-hour-old dates')
```

Run tests:
```bash
npm test
```

> **Note:** You'll need a test runner. Install vitest if not already present:
> ```bash
> npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
> ```
> Add to `package.json`: `"test": "vitest"`
