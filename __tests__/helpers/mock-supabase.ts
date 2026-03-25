import { vi } from "vitest"

/**
 * Creates a chainable Supabase query builder mock.
 * Every method returns `this` for chaining, except terminal methods
 * (single, maybeSingle) which resolve with { data, error }.
 */
export function createMockQueryBuilder(
  data: unknown = null,
  error: unknown = null
) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}

  const chainMethods = [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "is",
    "in",
    "gt",
    "lt",
    "gte",
    "lte",
    "order",
    "limit",
    "range",
    "filter",
  ]

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  // Terminal methods resolve with the configured data/error
  builder.single = vi.fn().mockResolvedValue({ data, error })
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error })

  return builder
}

/**
 * Creates a full mock Supabase client.
 * Use `mockFrom` to configure per-table responses.
 *
 * @example
 * ```ts
 * const { supabase, mockFrom } = createMockSupabase()
 * mockFrom("lists", { data: { id: "1", name: "Test" } })
 * ```
 */
export function createMockSupabase() {
  const tableBuilders = new Map<string, ReturnType<typeof createMockQueryBuilder>>()
  const defaultBuilder = createMockQueryBuilder()

  const fromFn = vi.fn((table: string) => {
    return tableBuilders.get(table) ?? defaultBuilder
  })

  const supabase = {
    from: fromFn,
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
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

  function mockFrom(
    table: string,
    response: { data?: unknown; error?: unknown } = {}
  ) {
    const builder = createMockQueryBuilder(
      response.data ?? null,
      response.error ?? null
    )
    tableBuilders.set(table, builder)
    return builder
  }

  return { supabase, mockFrom }
}
