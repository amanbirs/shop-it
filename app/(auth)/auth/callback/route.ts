import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/"

  const supabase = await createClient()

  // Handle code exchange (PKCE flow)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("[auth/callback] Code exchange failed:", error.message)
  }

  // Handle token hash (magic link / email OTP flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "email" | "signup" | "magiclink",
    })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("[auth/callback] OTP verification failed:", error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
