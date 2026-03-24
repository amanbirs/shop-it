import { createClient } from "@/lib/supabase/server"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, avatar_url")
    .eq("id", user?.id ?? "")
    .single()

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Name:</span>{" "}
          {profile?.name ?? "Not set"}
        </p>
        <p>
          <span className="text-muted-foreground">Email:</span>{" "}
          {profile?.email ?? user?.email}
        </p>
      </div>
      <p className="text-muted-foreground">
        Profile editing, user context, and preferences will be built here.
      </p>
    </div>
  )
}
