"use client"

import { useState, useTransition } from "react"
import { Users, Calendar, Wallet } from "lucide-react"
import { toast } from "sonner"
import { updateList } from "@/lib/actions/lists"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { InviteMemberDialog } from "@/components/collaboration/invite-member-dialog"
import { formatPrice } from "@/lib/utils"

type ListHeaderMetaProps = {
  listId: string
  budgetMin: number | null
  budgetMax: number | null
  purchaseBy: string | null
  priorities: string[]
  memberCount: number
  members: Array<{
    id: string
    user_id: string
    role: string
    joined_at: string | null
    created_at: string
    profile: { name: string | null; email: string; avatar_url: string | null } | null
  }>
  currentUserId: string
  isOwner: boolean
  listName: string
}

export function ListHeaderMeta({
  listId,
  budgetMin,
  budgetMax,
  purchaseBy,
  priorities,
  memberCount,
  members,
  currentUserId,
  isOwner,
  listName,
}: ListHeaderMetaProps) {
  const [isPending, startTransition] = useTransition()
  const [inviteOpen, setInviteOpen] = useState(false)

  // Budget popover state
  const [budgetMinEdit, setBudgetMinEdit] = useState(budgetMin?.toString() ?? "")
  const [budgetMaxEdit, setBudgetMaxEdit] = useState(budgetMax?.toString() ?? "")
  const [budgetOpen, setBudgetOpen] = useState(false)

  // Deadline popover state
  const [dateEdit, setDateEdit] = useState(purchaseBy ?? "")
  const [dateOpen, setDateOpen] = useState(false)

  // Priorities popover state
  const [prioritiesEdit, setPrioritiesEdit] = useState(priorities.join(", "))
  const [prioritiesOpen, setPrioritiesOpen] = useState(false)

  const saveBudget = () => {
    startTransition(async () => {
      const result = await updateList({
        listId,
        budget_min: budgetMinEdit ? Number(budgetMinEdit) : null,
        budget_max: budgetMaxEdit ? Number(budgetMaxEdit) : null,
      })
      if (!result.success) toast.error(result.error.message)
      else {
        toast.success("Budget updated")
        setBudgetOpen(false)
      }
    })
  }

  const saveDate = () => {
    startTransition(async () => {
      const result = await updateList({
        listId,
        purchase_by: dateEdit || null,
      })
      if (!result.success) toast.error(result.error.message)
      else {
        toast.success("Deadline updated")
        setDateOpen(false)
      }
    })
  }

  const savePriorities = () => {
    const parsed = prioritiesEdit
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    startTransition(async () => {
      const result = await updateList({ listId, priorities: parsed })
      if (!result.success) toast.error(result.error.message)
      else {
        toast.success("Priorities updated")
        setPrioritiesOpen(false)
      }
    })
  }

  const budgetText = budgetMin != null
    ? `${formatPrice(budgetMin)}${budgetMax != null ? ` – ${formatPrice(budgetMax)}` : ""}`
    : "Set budget"

  const dateText = purchaseBy
    ? new Date(purchaseBy).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : "Set deadline"

  const priorityCount = priorities.length

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {/* Budget */}
      <Popover open={budgetOpen} onOpenChange={setBudgetOpen}>
        <PopoverTrigger className="flex items-center gap-1 hover:text-foreground underline-offset-4 hover:underline transition-colors cursor-pointer">
          <Wallet className="h-3.5 w-3.5" />
          {budgetText}
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-3">
          <p className="text-sm font-medium">Budget range</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Min</Label>
              <Input
                type="number"
                value={budgetMinEdit}
                onChange={(e) => setBudgetMinEdit(e.target.value)}
                placeholder="30000"
              />
            </div>
            <div>
              <Label className="text-xs">Max</Label>
              <Input
                type="number"
                value={budgetMaxEdit}
                onChange={(e) => setBudgetMaxEdit(e.target.value)}
                placeholder="50000"
              />
            </div>
          </div>
          <Button size="sm" onClick={saveBudget} disabled={isPending} className="w-full">
            Save
          </Button>
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground/30">·</span>

      {/* Deadline */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger className="flex items-center gap-1 hover:text-foreground underline-offset-4 hover:underline transition-colors cursor-pointer">
          <Calendar className="h-3.5 w-3.5" />
          {dateText}
        </PopoverTrigger>
        <PopoverContent className="w-52 space-y-3">
          <p className="text-sm font-medium">Buy by</p>
          <Input
            type="date"
            value={dateEdit}
            onChange={(e) => setDateEdit(e.target.value)}
          />
          <Button size="sm" onClick={saveDate} disabled={isPending} className="w-full">
            Save
          </Button>
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground/30">·</span>

      {/* Members */}
      <button
        onClick={() => setInviteOpen(true)}
        className="flex items-center gap-1 hover:text-foreground underline-offset-4 hover:underline transition-colors"
      >
        <Users className="h-3.5 w-3.5" />
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </button>

      {/* Priorities */}
      {priorityCount > 0 && (
        <>
          <span className="text-muted-foreground/30">·</span>
          <Popover open={prioritiesOpen} onOpenChange={setPrioritiesOpen}>
            <PopoverTrigger className="hover:text-foreground underline-offset-4 hover:underline transition-colors cursor-pointer">
              {priorityCount} {priorityCount === 1 ? "priority" : "priorities"}
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3">
              <p className="text-sm font-medium">Priorities</p>
              <p className="text-xs text-muted-foreground">Comma-separated, in order of importance</p>
              <Input
                value={prioritiesEdit}
                onChange={(e) => setPrioritiesEdit(e.target.value)}
                placeholder="picture quality, low input lag"
              />
              <Button size="sm" onClick={savePriorities} disabled={isPending} className="w-full">
                Save
              </Button>
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Invite dialog */}
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        listId={listId}
        listName={listName}
        members={members}
        currentUserId={currentUserId}
        isOwner={isOwner}
      />
    </div>
  )
}
