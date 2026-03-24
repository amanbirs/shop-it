"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { updateList, archiveList } from "@/lib/actions/lists"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { InviteMemberDialog } from "@/components/collaboration/invite-member-dialog"

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

type ListSettingsFormProps = {
  list: {
    id: string
    name: string
    description: string | null
    category: string | null
    budget_min: number | null
    budget_max: number | null
    purchase_by: string | null
    priorities: string[]
  }
  members: Member[]
  currentUserId: string
  isOwner: boolean
}

export function ListSettingsForm({
  list,
  members,
  currentUserId,
  isOwner,
}: ListSettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description ?? "")
  const [category, setCategory] = useState(list.category ?? "")
  const [budgetMin, setBudgetMin] = useState(list.budget_min?.toString() ?? "")
  const [budgetMax, setBudgetMax] = useState(list.budget_max?.toString() ?? "")
  const [purchaseBy, setPurchaseBy] = useState(list.purchase_by ?? "")
  const [priorities, setPriorities] = useState<string[]>(list.priorities ?? [])
  const [newPriority, setNewPriority] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateList({
        listId: list.id,
        name: name || undefined,
        description: description || null,
        category: category || null,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        purchase_by: purchaseBy || null,
        priorities,
      })

      if (!result.success) {
        toast.error(result.error.message)
      } else {
        toast.success("Settings saved")
      }
    })
  }

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveList({ listId: list.id })
      if (!result.success) {
        toast.error(result.error.message)
      } else {
        toast.success("List archived")
        router.push("/")
      }
    })
  }

  const addPriority = () => {
    const trimmed = newPriority.trim()
    if (trimmed && !priorities.includes(trimmed)) {
      setPriorities([...priorities, trimmed])
      setNewPriority("")
    }
  }

  const removePriority = (index: number) => {
    setPriorities(priorities.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* List Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">List Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner && true}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., electronics, furniture"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you looking for?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Budget & Deadline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget & Deadline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget-min">Min budget</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ₹
                </span>
                <Input
                  id="budget-min"
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="30,000"
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-max">Max budget</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  ₹
                </span>
                <Input
                  id="budget-max"
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="50,000"
                  className="pl-7"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-by">Need to buy by</Label>
            <Input
              id="purchase-by"
              type="date"
              value={purchaseBy}
              onChange={(e) => setPurchaseBy(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Priorities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Priorities</CardTitle>
          <p className="text-sm text-muted-foreground">
            What matters most for this purchase? Ordered by importance — AI uses these to weight recommendations.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {priorities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {priorities.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                >
                  {p}
                  <button
                    onClick={() => removePriority(i)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${p}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              placeholder="e.g., noise level, energy efficiency"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addPriority()
                }
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={addPriority}
              disabled={!newPriority.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Members ({members.length})
            </CardTitle>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInviteOpen(true)}
              >
                Invite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((m) => {
              const memberName = m.profile?.name ?? m.profile?.email ?? "Unknown"
              const isPending_ = !m.joined_at
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <div>
                    <span className="font-medium">{memberName}</span>
                    {m.user_id === currentUserId && (
                      <span className="text-muted-foreground ml-1">(you)</span>
                    )}
                    {isPending_ && (
                      <span className="text-xs text-extraction-pending ml-2">
                        Pending
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {m.role}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-auto">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save Settings
      </Button>

      {/* Danger Zone */}
      {isOwner && (
        <>
          <Separator />
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Archiving a list hides it from the dashboard. Products and
                comments are preserved but no longer accessible.
              </p>
              <AlertDialog>
                <AlertDialogTrigger
                  className="inline-flex items-center gap-2 rounded-md border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Archive this list
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive list?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will hide &ldquo;{list.name}&rdquo; from the
                      dashboard for all members. This action can be undone by a
                      database admin.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchive}>
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </>
      )}

      {/* Invite dialog */}
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        listId={list.id}
        listName={list.name}
        members={members}
        currentUserId={currentUserId}
        isOwner={isOwner}
      />
    </div>
  )
}
