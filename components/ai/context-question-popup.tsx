"use client"

import { useState, useTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Loader2, ChevronRight, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { answerContextQuestion, dismissContextQuestion } from "@/lib/actions/context-questions"
import { Textarea } from "@/components/ui/textarea"
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
  const [minimized, setMinimized] = useState(false)
  const [expanded, setExpanded] = useState(false) // mobile: expand from bar

  const visible = pending.filter((q) => !dismissed.has(q.id))
  const current = visible[currentIndex]
  const remaining = visible.length - currentIndex - 1

  if (!current || minimized) {
    // Show a tiny "N questions" pill if minimized with pending questions
    if (minimized && visible.length > 0) {
      return (
        <div className="fixed bottom-4 right-4 z-50 lg:bottom-6 lg:right-6">
          <button
            onClick={() => setMinimized(false)}
            className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-md hover:text-foreground transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
            {visible.length} {visible.length === 1 ? "question" : "questions"}
          </button>
        </div>
      )
    }
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!answer.trim() || isPending) return

    startTransition(async () => {
      const result = await answerContextQuestion({
        questionId: current.id,
        answer: answer.trim(),
      })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }

      setAnswer("")
      const isLast = currentIndex >= visible.length - 1
      if (isLast) {
        toast.success("All done — your answers will improve recommendations!")
      }
      if (!isLast) {
        setCurrentIndex((i) => i + 1)
      }
    })
  }

  const handlePermanentDismiss = () => {
    startTransition(async () => {
      await dismissContextQuestion({ questionId: current.id })
      setDismissed((prev) => new Set(prev).add(current.id))
      setAnswer("")
    })
  }

  return (
    <>
      {/* Desktop: floating card */}
      <div className="fixed bottom-6 right-6 z-50 hidden lg:block">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.4, 0, 1] as const }}
            className="w-80 rounded-xl border bg-card shadow-lg shadow-black/10 dark:shadow-black/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-xs font-medium text-muted-foreground">
                Quick question
              </span>
              <button
                onClick={() => setMinimized(true)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
                aria-label="Minimize — ask later"
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
            <form onSubmit={handleSubmit} className="px-4 pb-3 space-y-2">
              <Textarea
                value={answer}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswer(e.target.value)}
                placeholder="Your answer..."
                className="text-sm min-h-[36px] max-h-[120px] resize-none"
                rows={2}
                disabled={isPending}
                autoFocus
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 shrink-0"
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

            {/* Footer */}
            <div className="border-t border-border px-4 py-2 flex items-center justify-between">
              <button
                onClick={handlePermanentDismiss}
                disabled={isPending}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground"
              >
                Don&apos;t ask this
              </button>
              <div className="flex items-center gap-2">
                {remaining > 0 && (
                  <span className="text-xs text-muted-foreground">
                    +{remaining} more
                  </span>
                )}
                <button
                  onClick={() => {
                    setAnswer("")
                    if (remaining > 0) {
                      setCurrentIndex((i) => i + 1)
                    } else {
                      setMinimized(true)
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                >
                  Skip
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile: compact bar that expands */}
      <div className="fixed bottom-14 left-0 right-0 z-50 px-3 lg:hidden">
        <AnimatePresence mode="wait">
          {!expanded ? (
            <motion.button
              key="bar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => setExpanded(true)}
              className="w-full flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 shadow-md"
            >
              <span className="text-xs text-muted-foreground truncate mr-2">
                {current.question}
              </span>
              <span className="text-xs text-foreground shrink-0">Answer</span>
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rounded-xl border bg-card shadow-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm leading-relaxed pr-2">{current.question}</p>
                <button
                  onClick={() => { setExpanded(false); setMinimized(true) }}
                  className="text-muted-foreground hover:text-foreground p-1 -mr-1 -mt-1 shrink-0"
                  aria-label="Minimize"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={(e) => { handleSubmit(e); setExpanded(false) }} className="space-y-2">
                <Textarea
                  value={answer}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswer(e.target.value)}
                  placeholder="Your answer..."
                  className="text-sm min-h-[36px] max-h-[80px] resize-none"
                  rows={1}
                  disabled={isPending}
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handlePermanentDismiss}
                      disabled={isPending}
                      className="text-xs text-muted-foreground/60"
                    >
                      Don&apos;t ask
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnswer("")
                        setExpanded(false)
                        if (remaining > 0) setCurrentIndex((i) => i + 1)
                        else setMinimized(true)
                      }}
                      className="text-xs text-muted-foreground"
                    >
                      Skip
                    </button>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !answer.trim()}
                    className="h-8"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
