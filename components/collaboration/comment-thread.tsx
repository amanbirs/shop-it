"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { MessageCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { deleteComment } from "@/lib/actions/comments"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CommentInput } from "@/components/collaboration/comment-input"
import { relativeTime } from "@/lib/utils"

type CommentData = {
  id: string
  content: string
  parent_id: string | null
  created_at: string
  user_id: string
  profile: {
    name: string | null
    avatar_url: string | null
  } | null
}

type CommentThreadProps = {
  productId: string
  comments: CommentData[]
  currentUserId: string
  canEdit: boolean
  isOwner: boolean
}

export function CommentThread({
  productId,
  comments: initialComments,
  currentUserId,
  canEdit,
  isOwner,
}: CommentThreadProps) {
  const [comments, setComments] = useState(initialComments)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const supabase = createClient()

  // Sync with server data
  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  // Realtime subscription for comments
  const refresh = useCallback(() => {
    // Trigger a re-render by refetching — in practice this would
    // be handled by the parent's Realtime subscription refreshing the page
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel(`product-comments-${productId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `product_id=eq.${productId}`,
        },
        refresh
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [productId, supabase, refresh])

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      const result = await deleteComment({ commentId })
      if (!result.success) {
        toast.error(result.error.message)
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      }
    })
  }

  // Split into top-level and replies
  const topLevel = comments.filter((c) => !c.parent_id)
  const replies = comments.filter((c) => c.parent_id)

  const getReplies = (parentId: string) =>
    replies.filter((r) => r.parent_id === parentId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          Comments ({comments.length})
        </span>
      </div>

      {/* Comment list */}
      {topLevel.length > 0 && (
        <div className="space-y-3">
          {topLevel.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <CommentBubble
                comment={comment}
                currentUserId={currentUserId}
                isOwner={isOwner}
                onReply={() => setReplyingTo(comment.id)}
                onDelete={() => handleDelete(comment.id)}
                canEdit={canEdit}
              />
              {/* Replies */}
              {getReplies(comment.id).map((reply) => (
                <div key={reply.id} className="ml-8">
                  <CommentBubble
                    comment={reply}
                    currentUserId={currentUserId}
                    isOwner={isOwner}
                    onDelete={() => handleDelete(reply.id)}
                    canEdit={canEdit}
                  />
                </div>
              ))}
              {/* Reply input */}
              {replyingTo === comment.id && (
                <div className="ml-8">
                  <CommentInput
                    productId={productId}
                    parentId={comment.id}
                    onCancel={() => setReplyingTo(null)}
                    placeholder="Write a reply..."
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New comment input */}
      {canEdit && (
        <CommentInput productId={productId} />
      )}
    </div>
  )
}

function CommentBubble({
  comment,
  currentUserId,
  isOwner,
  onReply,
  onDelete,
  canEdit,
}: {
  comment: CommentData
  currentUserId: string
  isOwner: boolean
  onReply?: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const isAuthor = comment.user_id === currentUserId
  const canDelete = isAuthor || isOwner
  const name = comment.profile?.name ?? "Unknown"
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex gap-2.5 group">
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarImage src={comment.profile?.avatar_url ?? undefined} />
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">
            {relativeTime(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-foreground/90 mt-0.5">{comment.content}</p>
        <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onReply && canEdit && (
            <button
              onClick={onReply}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reply
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-muted-foreground hover:text-destructive"
              aria-label={`Delete comment by ${name}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
