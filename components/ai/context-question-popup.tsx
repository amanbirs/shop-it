"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Sparkles, Send, Loader2, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { answerContextQuestion, dismissContextQuestion } from "@/lib/actions/context-questions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { ContextQuestion } from "@/lib/types/database"

type ContextQuestionPopupProps = {
  questions: ContextQuestion[]
}

export function ContextQuestionPopup({ questions }: ContextQuestionPopupProps) {
  const pending = questions.filter((q) => q.status === "pending")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState("")
  const [isPending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Filter out locally dismissed questions
  const visible = pending.filter((q) => !dismissed.has(q.id))
  const current = visible[currentIndex]
  const remaining = visible.length - currentIndex - 1

  if (!current) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim()) return

    startTransition(async () => {
      const result = await answerContextQuestion({
        questionId: current.id,
        answer: answer.trim(),
      })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }

      toast.success("Got it, thanks!")
      setAnswer("")
      // Move to next question
      if (currentIndex < visible.length - 1) {
        setCurrentIndex((i) => i + 1)
      }
    })
  }

  const handleDismiss = () => {
    startTransition(async () => {
      await dismissContextQuestion({ questionId: current.id })
      setDismissed((prev) => new Set(prev).add(current.id))
      setAnswer("")
    })
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 lg:bottom-6 lg:right-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.25, 0.4, 0, 1] as const }}
          className="w-80 rounded-xl border border-ai-accent/20 bg-card shadow-lg shadow-black/10 dark:shadow-black/30"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-1.5 text-xs text-ai-accent font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Quick question
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
              aria-label="Dismiss question"
              disabled={isPending}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Question */}
          <div className="px-4 py-2">
            <p className="text-sm leading-relaxed">{current.question}</p>
          </div>

          {/* Answer input */}
          <form onSubmit={handleSubmit} className="px-4 pb-3">
            <div className="flex gap-2">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your answer..."
                className="text-sm h-9"
                disabled={isPending}
                autoFocus
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 shrink-0 bg-ai-accent hover:bg-ai-accent/90 text-white"
                disabled={isPending || !answer.trim()}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </form>

          {/* Footer: remaining count */}
          {remaining > 0 && (
            <div className="border-t border-border px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {remaining} more {remaining === 1 ? "question" : "questions"}
              </span>
              <button
                onClick={() => {
                  setAnswer("")
                  setCurrentIndex((i) => i + 1)
                }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                Skip
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
