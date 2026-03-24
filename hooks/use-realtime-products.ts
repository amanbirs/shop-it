"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { generateContextQuestions } from "@/lib/actions/context-questions"

/**
 * Subscribe to Realtime changes on products in a list.
 * Powers extraction progress updates and collaborative edits.
 * On any change, triggers router.refresh() to re-fetch server data.
 * When extraction completes, triggers context question generation.
 */
export function useRealtimeProducts(listId: string) {
  const router = useRouter()
  const supabase = createClient()
  const generatingRef = useRef(false)

  const handleChange = useCallback(
    (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
      router.refresh()

      // Detect extraction completion → generate context questions
      const newStatus = payload.new?.extraction_status
      const oldStatus = payload.old?.extraction_status
      const productId = payload.new?.id as string | undefined

      if (
        newStatus === "completed" &&
        oldStatus !== "completed" &&
        productId &&
        !generatingRef.current
      ) {
        generatingRef.current = true
        generateContextQuestions(listId, productId)
          .catch(() => {})
          .finally(() => {
            generatingRef.current = false
          })
      }
    },
    [router, listId]
  )

  useEffect(() => {
    const productsChannel = supabase
      .channel(`list-products-${listId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `list_id=eq.${listId}`,
        },
        handleChange
      )
      .subscribe()

    // Subscribe to suggestion changes (new suggestions, accept/dismiss)
    const suggestionsChannel = supabase
      .channel(`list-suggestions-${listId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_suggestions",
          filter: `list_id=eq.${listId}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(productsChannel)
      supabase.removeChannel(suggestionsChannel)
    }
  }, [listId, supabase, handleChange, router])
}
