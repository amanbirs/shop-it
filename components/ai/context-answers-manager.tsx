"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2, RotateCcw, Check, X, MessageCircleQuestion } from "lucide-react"
import { toast } from "sonner"
import {
  updateContextAnswer,
  deleteContextQuestion,
  undismissContextQuestion,
} from "@/lib/actions/context-questions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ContextQuestion } from "@/lib/types/database"

type ContextAnswersManagerProps = {
  questions: ContextQuestion[]
}

export function ContextAnswersManager({ questions }: ContextAnswersManagerProps) {
  const answered = questions.filter((q) => q.status === "answered")
  const dismissed = questions.filter((q) => q.status === "dismissed")
  const pending = questions.filter((q) => q.status === "pending")

  if (questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-ai-accent" />
            Your Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            As you add products, ShopIt will ask smart questions to personalize
            your AI recommendations. Your answers will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-ai-accent" />
          Your Preferences ({answered.length} answered)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          These answers help the AI give better recommendations. Edit or remove
          anytime.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Answered questions */}
        {answered.length > 0 && (
          <div className="space-y-2">
            {answered.map((q) => (
              <AnswerRow key={q.id} question={q} />
            ))}
          </div>
        )}

        {/* Pending questions */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Unanswered
            </p>
            {pending.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-muted-foreground">{q.question}</span>
                <Badge variant="secondary" className="text-xs">
                  Pending
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Dismissed questions */}
        {dismissed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Dismissed
            </p>
            {dismissed.map((q) => (
              <DismissedRow key={q.id} question={q} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AnswerRow({ question }: { question: ContextQuestion }) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(question.answer ?? "")
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateContextAnswer({
        questionId: question.id,
        answer: editValue,
      })
      if (!result.success) {
        toast.error(result.error.message)
      } else {
        setEditing(false)
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteContextQuestion({ questionId: question.id })
      if (!result.success) toast.error(result.error.message)
    })
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
      <p className="text-sm font-medium">{question.question}</p>
      {editing ? (
        <div className="flex gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="text-sm h-8"
            autoFocus
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleSave}
            disabled={isPending}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              setEditing(false)
              setEditValue(question.answer ?? "")
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{question.answer}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit answer"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete question and answer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DismissedRow({ question }: { question: ContextQuestion }) {
  const [isPending, startTransition] = useTransition()

  const handleRestore = () => {
    startTransition(async () => {
      const result = await undismissContextQuestion({
        questionId: question.id,
      })
      if (!result.success) {
        toast.error(result.error.message)
      } else {
        toast.success("Question restored — it'll appear next time")
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteContextQuestion({ questionId: question.id })
      if (!result.success) toast.error(result.error.message)
    })
  }

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted-foreground line-through">{question.question}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={handleRestore}
          disabled={isPending}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Restore question"
          title="Restore — ask this question again"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Delete permanently"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
