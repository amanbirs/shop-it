"use client"

import { useState, useTransition } from "react"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function SetPasswordBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (dismissed) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        return
      }

      // Mark profile as having a password
      await supabase.from("profiles").update({ has_password: true }).eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")

      toast.success("Password set — you can now sign in with email and password")
      setDismissed(true)
    })
  }

  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium">Set a password</p>
          <p className="text-xs text-muted-foreground">
            Create a password so you can sign in without a magic link next time.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={isPending || !password || !confirm}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set password"}
        </Button>
      </form>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
