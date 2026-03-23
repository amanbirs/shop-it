import { createClient } from "@supabase/supabase-js"

/**
 * Admin client that bypasses RLS using the secret API key.
 * ONLY use for:
 * - Expert Opinion API route (AI writes)
 * - Edge Function (product extraction)
 * NEVER import in Server Actions or Client Components.
 */
export function createAdminClient() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is not set")

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
