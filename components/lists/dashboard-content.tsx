"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { ListCard } from "@/components/lists/list-card"
import { CreateListDialog } from "@/components/lists/create-list-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type ListData = {
  id: string
  name: string
  category: string | null
  category_emoji: string
  ai_comment: string | null
  ai_title_edited: boolean
  productCount: number
  shortlistedCount: number
  purchasedCount: number
  memberCount: number
}

type DashboardContentProps = {
  lists: ListData[]
}

export function DashboardContent({ lists }: DashboardContentProps) {
  const [createOpen, setCreateOpen] = useState(false)

  if (lists.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No lists yet"
          description="Start your first purchase decision. Paste a product URL and let ShopIt do the research."
          actionLabel="+ Create a List"
          onAction={() => setCreateOpen(true)}
        />
        <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Lists</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New List
        </Button>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lists.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}

        {/* New list dashed card */}
        <button
          onClick={() => setCreateOpen(true)}
          className="block"
        >
          <Card className="h-full border-dashed border-2 border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-accent/50 transition-all cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
              <Plus className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">New List</span>
            </CardContent>
          </Card>
        </button>
      </div>

      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
