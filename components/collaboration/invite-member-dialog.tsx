"use client"

import { useState, useTransition } from "react"
import { Loader2, Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { inviteMember } from "@/lib/actions/members"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { MemberList } from "@/components/collaboration/member-list"

type Member = {
  id: string
  user_id: string
  role: string
  joined_at: string | null
  created_at: string
  profile: {
    name: string | null
    email: string
    avatar_url: string | null
  } | null
}

type InviteMemberDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  listId: string
  listName: string
  members: Member[]
  currentUserId: string
  isOwner: boolean
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  listId,
  listName,
  members,
  currentUserId,
  isOwner,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"editor" | "viewer">("editor")
  const [isPending, startTransition] = useTransition()
  const [sendState, setSendState] = useState<"idle" | "sent">("idle")
  const [copied, setCopied] = useState(false)

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    startTransition(async () => {
      const result = await inviteMember({ listId, email: email.trim(), role })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }

      setSendState("sent")
      setTimeout(() => {
        setSendState("idle")
        setEmail("")
      }, 1500)
    })
  }

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/invite/${listId}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader>
          <DialogTitle className="line-clamp-1">
            Share &ldquo;{listName}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Email invite */}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-3">
              <p className="text-sm font-medium">Invite by email</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as "editor" | "viewer")}
                >
                  <SelectTrigger className="w-[100px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={isPending || !email.trim()}
                className="w-full sm:w-auto"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : sendState === "sent" ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Sent
                  </>
                ) : (
                  "Send Invite"
                )}
              </Button>
            </form>
          )}

          {/* Share link */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">
                or share via link
              </span>
              <Separator className="flex-1" />
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 min-w-0 overflow-hidden">
              <code className="flex-1 truncate text-xs text-muted-foreground min-w-0">
                /invite/{listId}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCopyLink}
                aria-label="Copy invite link"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-purchased" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can join as {role}
            </p>
          </div>

          <Separator />

          {/* Member list */}
          <MemberList
            listId={listId}
            members={members}
            currentUserId={currentUserId}
            isOwner={isOwner}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
