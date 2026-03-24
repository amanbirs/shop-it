"use client"

import { useTransition } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import { removeMember, updateRole } from "@/lib/actions/members"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { relativeTime } from "@/lib/utils"

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

type MemberListProps = {
  listId: string
  members: Member[]
  currentUserId: string
  isOwner: boolean
}

export function MemberList({
  listId,
  members,
  currentUserId,
  isOwner,
}: MemberListProps) {
  const [isPending, startTransition] = useTransition()

  const handleRoleChange = (memberId: string, newRole: string) => {
    startTransition(async () => {
      const result = await updateRole({ listId, memberId, role: newRole })
      if (!result.success) toast.error(result.error.message)
    })
  }

  const handleRemove = (memberId: string, name: string) => {
    startTransition(async () => {
      const result = await removeMember({ listId, memberId })
      if (!result.success) {
        toast.error(result.error.message)
      } else {
        toast.success(`${name} removed from list`)
      }
    })
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">Members ({members.length})</p>
      <div className="space-y-2">
        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId
          const isPending_ = !member.joined_at
          const name = member.profile?.name ?? member.profile?.email ?? "Unknown"
          const email = member.profile?.email ?? ""
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">
                    {isPending_ ? email : name}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                  {isPending_ && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-extraction-pending/10 text-extraction-pending"
                    >
                      Pending
                    </Badge>
                  )}
                </div>
                {isPending_ && (
                  <p className="text-xs text-muted-foreground">
                    Invited {relativeTime(member.created_at)}
                  </p>
                )}
              </div>

              {/* Role display/editor */}
              {isOwner && !isCurrentUser ? (
                <Select
                  defaultValue={member.role}
                  onValueChange={(val) => val && handleRoleChange(member.id, val)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-7 w-[90px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs text-muted-foreground capitalize">
                  {member.role}
                </span>
              )}

              {/* Remove button */}
              {isOwner && !isCurrentUser && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(member.id, name)}
                  disabled={isPending}
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
