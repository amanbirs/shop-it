import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { origin } = new URL(request.url)

  // Look up the invite token using admin client (bypasses RLS)
  const admin = createAdminClient()
  const { data: invite } = await admin
    .from("invite_tokens")
    .select("id, list_id, role, expires_at, used_at")
    .eq("token", token)
    .single()

  if (!invite) {
    return NextResponse.redirect(`${origin}/login?error=invalid-invite`)
  }

  if (invite.used_at) {
    return NextResponse.redirect(`${origin}/lists/${invite.list_id}`)
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.redirect(`${origin}/login?error=invite-expired`)
  }

  // Check if user is authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in — redirect to login with return URL
    return NextResponse.redirect(
      `${origin}/login?returnTo=/invite/${token}`
    )
  }

  // User is logged in — add them to the list
  try {
    // Check if already a member
    const { data: existing } = await admin
      .from("list_members")
      .select("id")
      .eq("list_id", invite.list_id)
      .eq("user_id", user.id)
      .single()

    if (!existing) {
      // Add as member
      await admin.from("list_members").insert({
        list_id: invite.list_id,
        user_id: user.id,
        role: invite.role,
        joined_at: new Date().toISOString(),
      })
    }

    // Mark token as used
    await admin
      .from("invite_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id)

    return NextResponse.redirect(`${origin}/lists/${invite.list_id}`)
  } catch (err) {
    console.error("[invite] Failed to accept:", err)
    return NextResponse.redirect(`${origin}/?error=invite-failed`)
  }
}
