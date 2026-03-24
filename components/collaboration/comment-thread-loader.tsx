"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { CommentThread } from "@/components/collaboration/comment-thread"
import { Skeleton } from "@/components/ui/skeleton"

type CommentThreadLoaderProps = {
  productId: string
  currentUserId: string
  canEdit: boolean
  isOwner: boolean
}

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

export function CommentThreadLoader({
  productId,
  currentUserId,
  canEdit,
  isOwner,
}: CommentThreadLoaderProps) {
  const [comments, setComments] = useState<CommentData[] | null>(null)
  const supabase = createClient()

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("id, content, parent_id, created_at, user_id, profiles(name, avatar_url)")
      .eq("product_id", productId)
      .order("created_at", { ascending: true })

    if (data) {
      setComments(
        data.map((c) => ({
          ...c,
          profile: (c.profiles as unknown as { name: string | null; avatar_url: string | null }) ?? null,
        }))
      )
    }
  }, [productId, supabase])

  // Initial fetch
  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Realtime subscription — refetch on any change
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
        () => fetchComments()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [productId, supabase, fetchComments])

  if (comments === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  return (
    <CommentThread
      productId={productId}
      comments={comments}
      currentUserId={currentUserId}
      canEdit={canEdit}
      isOwner={isOwner}
    />
  )
}
