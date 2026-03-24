import { createClient } from "@/lib/supabase/server"

/**
 * Get the authenticated user from the current session.
 * Used as the first step in every Server Action.
 * Returns the user object or null if not authenticated.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
