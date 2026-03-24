"use client"

import { useState } from "react"
import { motion } from "framer-motion"
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

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.4, 0, 1] as const },
  },
}

const gridVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
}

export function DashboardContent({ lists }: DashboardContentProps) {
  const [createOpen, setCreateOpen] = useState(false)

  if (lists.length === 0) {
    return (
      <div className="p-6 h-full overflow-y-auto">
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
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Lists</h1>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New List
        </Button>
      </div>

      {/* Card grid with stagger animation */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={gridVariants}
        initial="hidden"
        animate="visible"
      >
        {lists.map((list) => (
          <motion.div key={list.id} variants={cardVariants}>
            <ListCard list={list} />
          </motion.div>
        ))}

        {/* New list dashed card */}
        <motion.div variants={cardVariants}>
          <button
            onClick={() => setCreateOpen(true)}
            className="block w-full h-full"
          >
            <Card className="h-full border-dashed border-2 border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-accent/50 transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Plus className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">New List</span>
              </CardContent>
            </Card>
          </button>
        </motion.div>
      </motion.div>

      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
