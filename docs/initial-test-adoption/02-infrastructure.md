# Test Infrastructure

## CI Pipeline (GitHub Actions)

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:run -- --coverage
```

### New package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

### Coverage Configuration

Add to `vitest.config.ts`:

```ts
test: {
  coverage: {
    provider: "v8",
    include: [
      "lib/actions/**",
      "lib/validators/**",
      "lib/ai/**",
      "lib/utils.ts",
      "lib/constants.ts",
      "app/api/**",
      "hooks/**",
    ],
    exclude: [
      "lib/supabase/**",      // Client setup — tested via integration
      "components/ui/**",      // shadcn primitives — not our code
      "**/*.test.{ts,tsx}",
    ],
    thresholds: {
      // Start low, ratchet up as we add tests
      statements: 40,
      branches: 30,
      functions: 40,
      lines: 40,
    },
  },
}
```

Install coverage provider:
```bash
npm install -D @vitest/coverage-v8
```

## Mocking Patterns

### Supabase Mock (for Server Actions)

Every Server Action imports `createClient` and `getAuthenticatedUser`. We need a reusable mock.

Create `__tests__/helpers/mock-supabase.ts`:

```ts
import { vi } from "vitest"

// Chainable query builder mock
export function createMockQueryBuilder(data: unknown = null, error: unknown = null) {
  const builder: Record<string, unknown> = {}
  const methods = ["select", "insert", "update", "delete", "upsert",
    "eq", "neq", "is", "in", "gt", "lt", "gte", "lte",
    "single", "maybeSingle", "order", "limit", "range"]

  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  // Terminal methods return the data
  builder.single = vi.fn().mockResolvedValue({ data, error })
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error })

  // For non-terminal chains that resolve
  builder.then = vi.fn((cb) => cb({ data, error, count: Array.isArray(data) ? data.length : 0 }))

  return builder
}

export function createMockSupabase() {
  return {
    from: vi.fn().mockReturnValue(createMockQueryBuilder()),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  }
}
```

### Auth Mock

```ts
// Mock getAuthenticatedUser
vi.mock("@/lib/supabase/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}))

// Mock createClient
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))
```

### Next.js Mocks

```ts
// Mock revalidatePath (used in almost every action)
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Mock useRouter (for component/hook tests)
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}))
```

### AI/Gemini Mock

```ts
vi.mock("@/lib/ai/gemini", () => ({
  callGemini: vi.fn(),
}))
```

## File Organization

```
__tests__/
  helpers/
    mock-supabase.ts        # Reusable Supabase mock factory
    fixtures.ts             # Test data factories (lists, products, users)
    setup-action-test.ts    # Common setup for Server Action tests

lib/
  validators/
    *.test.ts               # Co-located with source (already exists)
  actions/
    __tests__/
      lists.test.ts         # Server Action tests
      products.test.ts
      comments.test.ts
      members.test.ts
      ai.test.ts
      chat.test.ts
      suggestions.test.ts
      context-questions.test.ts
  ai/
    __tests__/
      gemini.test.ts
      prompts.test.ts
  utils.test.ts             # Already exists, co-located

app/
  api/
    lists/[listId]/expert-opinion/
      route.test.ts

hooks/
  __tests__/
    use-realtime-products.test.ts

components/
  __tests__/                # Component-level integration tests
    ...
```

### Test Data Fixtures

Create `__tests__/helpers/fixtures.ts`:

```ts
export const TEST_USER = {
  id: "user-001",
  email: "test@example.com",
}

export const TEST_LIST = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "TV Shopping",
  category: "electronics",
  owner_id: TEST_USER.id,
}

export const TEST_PRODUCT = {
  id: "660e8400-e29b-41d4-a716-446655440000",
  list_id: TEST_LIST.id,
  url: "https://www.amazon.in/dp/B0EXAMPLE",
  domain: "amazon.in",
  extraction_status: "completed",
  title: "Sony Bravia 55 inch",
  brand: "Sony",
  price_min: 54990,
  price_max: 54990,
  currency: "INR",
}

export const TEST_MEMBER_OWNER = {
  id: "member-001",
  list_id: TEST_LIST.id,
  user_id: TEST_USER.id,
  role: "owner",
}
```
