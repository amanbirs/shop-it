"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createList } from "@/lib/actions/lists"
import { generateHypeTitle } from "@/lib/actions/ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type CreateListDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateListDialog({ open, onOpenChange }: CreateListDialogProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Form state
  const [category, setCategory] = useState("")
  const [listName, setListName] = useState("")
  const [description, setDescription] = useState("")
  const [budgetMin, setBudgetMin] = useState("")
  const [budgetMax, setBudgetMax] = useState("")
  const [purchaseBy, setPurchaseBy] = useState("")
  const [showOptional, setShowOptional] = useState(false)

  // AI title generation
  const [aiTitle, setAiTitle] = useState<string | null>(null)
  const [aiEmoji, setAiEmoji] = useState<string | null>(null)
  const [aiTitleLoading, setAiTitleLoading] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Submit state
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const handleCategoryChange = (value: string) => {
    setCategory(value)

    // Clear previous debounce
    if (debounceTimer) clearTimeout(debounceTimer)

    if (value.trim().length > 1) {
      setAiTitleLoading(true)
      const timer = setTimeout(async () => {
        const result = await generateHypeTitle({ category: value.trim() })
        setAiTitleLoading(false)
        if (result.success) {
          setAiTitle(result.data.title)
          setAiEmoji(result.data.emoji)
          // Auto-fill name if user hasn't typed one
          if (!listName) setListName(result.data.title)
        } else {
          setAiTitle(null)
          setAiEmoji(null)
        }
      }, 300)
      setDebounceTimer(timer)
    } else {
      setAiTitle(null)
      setAiEmoji(null)
      setAiTitleLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitState("loading")

    startTransition(async () => {
      const result = await createList({
        name: listName || aiTitle || category,
        category: category || undefined,
        category_emoji: aiEmoji || undefined,
        description: description || undefined,
        budget_min: budgetMin ? Number(budgetMin) : undefined,
        budget_max: budgetMax ? Number(budgetMax) : undefined,
        purchase_by: purchaseBy || undefined,
      })

      if (!result.success) {
        setSubmitState("error")
        setError(result.error.message)
        return
      }

      setSubmitState("success")
      setTimeout(() => {
        onOpenChange(false)
        resetForm()
        router.push(`/lists/${result.data.id}`)
      }, 400)
    })
  }

  const resetForm = () => {
    setCategory("")
    setListName("")
    setDescription("")
    setBudgetMin("")
    setBudgetMax("")
    setPurchaseBy("")
    setShowOptional(false)
    setAiTitle(null)
    setAiTitleLoading(false)
    setSubmitState("idle")
    setError(null)
  }

  const canSubmit = (category.trim() || listName.trim()) && submitState !== "loading"

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Create a new list</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category input */}
          <div className="space-y-2">
            <Label htmlFor="category">What are you shopping for?</Label>
            <Input
              id="category"
              placeholder="e.g., TV, running shoes, espresso machine"
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              autoFocus
              className="text-base"
            />
          </div>

          {/* AI title display slot */}
          <AnimatePresence mode="wait">
            {aiTitleLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="h-5 w-48 animate-pulse rounded bg-muted" />
                <span className="text-xs text-muted-foreground">Suggesting a name...</span>
              </motion.div>
            )}
            {aiTitle && !aiTitleLoading && (
              <motion.div
                key="title"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-muted-foreground"
              >
                Suggestion: {aiTitle}
              </motion.div>
            )}
          </AnimatePresence>

          {/* List name */}
          <div className="space-y-2">
            <Label htmlFor="name">List name</Label>
            <Input
              id="name"
              placeholder={aiTitle || "Name your list"}
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="text-base"
            />
          </div>

          {/* Optional details toggle */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                showOptional && "rotate-180"
              )}
            />
            Optional details
          </button>

          {/* Collapsible optional fields */}
          <AnimatePresence>
            {showOptional && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 rounded-lg bg-muted/20 p-4">
                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder='Looking for a 55-65" 4K TV for the living room...'
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  {/* Budget range */}
                  <div className="space-y-2">
                    <Label>Budget range</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <Input
                          type="number"
                          placeholder="30,000"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value)}
                          className="pl-7"
                          aria-label="Minimum budget"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <Input
                          type="number"
                          placeholder="50,000"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value)}
                          className="pl-7"
                          aria-label="Maximum budget"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Purchase by date */}
                  <div className="space-y-2">
                    <Label htmlFor="purchase-by">Need to buy by</Label>
                    <Input
                      id="purchase-by"
                      type="date"
                      value={purchaseBy}
                      onChange={(e) => setPurchaseBy(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      aria-label="Purchase deadline"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Submit button */}
          <Button
            type="submit"
            className={cn(
              "w-full transition-colors",
              submitState === "success" && "bg-green-600 hover:bg-green-600"
            )}
            disabled={!canSubmit}
            aria-busy={submitState === "loading"}
          >
            {submitState === "loading" && (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            )}
            {submitState === "success" && (
              <>
                <Check className="mr-2 h-4 w-4" />
                Created!
              </>
            )}
            {submitState === "idle" && "Create List →"}
            {submitState === "error" && "Create List →"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
