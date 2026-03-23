"use client"

import { useState, useTransition } from "react"
import { Send, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addComment } from "@/lib/actions/comments"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type CommentInputProps = {
  productId: string
  parentId?: string
  onCancel?: () => void
  placeholder?: string
}

export function CommentInput({
  productId,
  parentId,
  onCancel,
  placeholder = "Add a comment...",
}: CommentInputProps) {
  const [content, setContent] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      const result = await addComment({
        productId,
        content: content.trim(),
        parentId,
      })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }

      setContent("")
      onCancel?.()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {parentId && onCancel && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Replying</span>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="min-h-[36px] text-sm resize-none"
          disabled={isPending}
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0 h-9 w-9"
          disabled={isPending || !content.trim()}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  )
}
