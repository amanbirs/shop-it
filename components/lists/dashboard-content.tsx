"use client"

import { useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Plus, LayoutGrid, List } from "lucide-react"
import { useQueryState, parseAsStringLiteral } from "nuqs"
import { ListCard } from "@/components/lists/list-card"
import { CreateListDialog } from "@/components/lists/create-list-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

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

const viewModes = ["grid", "list"] as const

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
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(viewModes).withDefault("grid")
  )

  // Flashlight effect
  const gridRef = useRef<HTMLDivElement>(null)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = gridRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
      el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
    },
    []
  )
  const handleMouseLeave = useCallback(() => {
    gridRef.current?.style.setProperty("--mouse-x", "-1000px")
    gridRef.current?.style.setProperty("--mouse-y", "-1000px")
  }, [])

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
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="hidden sm:flex items-center rounded-md border border-input">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "p-1.5 rounded-l-md transition-colors",
                view === "grid"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-1.5 rounded-r-md transition-colors",
                view === "list"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New List
          </Button>
        </div>
      </div>

      {/* Card grid with flashlight + stagger animation */}
      <motion.div
        ref={gridRef}
        className={cn(
          "relative gap-4",
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col"
        )}
        variants={gridVariants}
        initial="hidden"
        animate="visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          {
            "--mouse-x": "-1000px",
            "--mouse-y": "-1000px",
          } as React.CSSProperties
        }
      >
        {/* Flashlight overlay — desktop only */}
        <div
          className="pointer-events-none absolute inset-0 z-10 hidden lg:block rounded-xl"
          style={{
            background:
              "radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), oklch(0.541 0.281 293.009 / 0.06), transparent 40%)",
          }}
        />

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
              <CardContent
                className={cn(
                  "flex items-center justify-center text-muted-foreground",
                  view === "grid"
                    ? "flex-col p-8"
                    : "flex-row gap-2 p-4"
                )}
              >
                <Plus className={view === "grid" ? "h-8 w-8 mb-2" : "h-5 w-5"} />
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
