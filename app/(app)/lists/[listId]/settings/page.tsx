import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export default async function ListSettingsPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: list } = await supabase
    .from("lists")
    .select("id, name")
    .eq("id", listId)
    .single()

  if (!list) notFound()

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center gap-3">
        <Link
          href={`/lists/${listId}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-semibold">Settings — {list.name}</h1>
      </div>
      <p className="text-muted-foreground">
        List settings (name, description, budget, deadline, priorities, members, danger zone) will be built here.
      </p>
    </div>
  )
}
