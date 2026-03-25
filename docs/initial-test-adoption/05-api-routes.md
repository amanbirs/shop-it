# API Routes — Test Inventory

## POST `/api/lists/[listId]/expert-opinion` (~14 tests)

**File:** `app/api/lists/[listId]/expert-opinion/route.ts`

This is the only API route in the app. It generates a comparative expert analysis using Gemini and upserts it via the admin client (bypasses RLS).

**Mocking strategy:** Mock `createClient`, `createAdminClient`, `callGemini`, `revalidatePath`, and `triggerSuggestions`. Test the route handler by calling `POST()` directly with a mock Request and params.

```
Auth
  - returns 401 when user is not signed in

Membership
  - returns 404 when user is not a member of the list

Product count
  - returns 422 when fewer than 2 completed products exist
  - returns 422 when 0 products exist
  - passes when exactly 2 products exist

Prompt building
  - passes product data, budget, priorities, user context to buildExpertOpinionPrompt
  - handles missing list metadata gracefully (null budget, no priorities)

AI call
  - calls callGemini with jsonMode: true, maxTokens: 8192
  - parses the JSON response correctly

Upsert
  - upserts to list_ai_opinions via admin client (not user client)
  - uses onConflict: "list_id" for idempotent writes
  - sets model_version to "gemini-3.1-flash-lite-preview"

Side effects
  - calls revalidatePath("/lists/[listId]")
  - triggers suggestions non-blocking with trigger "expert_opinion"

Error
  - returns 500 with AI_ERROR when callGemini throws
  - returns 500 when admin upsert fails
```

## Test approach

Since this is a Next.js route handler, test it by importing and calling the `POST` function directly:

```ts
import { POST } from "@/app/api/lists/[listId]/expert-opinion/route"

const response = await POST(
  new Request("http://localhost/api/lists/test-id/expert-opinion", { method: "POST" }),
  { params: Promise.resolve({ listId: "test-list-id" }) }
)

const body = await response.json()
expect(response.status).toBe(200)
expect(body.success).toBe(true)
```
