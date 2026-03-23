"use client"

import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Subscribe to Realtime changes on products in a list.
 * Powers extraction progress updates and collaborative edits.
 * On any change, triggers router.refresh() to re-fetch server data.
 */
export function useRealtimeProducts(listId: string) {
  const router = useRouter()
  const supabase = createClient()

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  useEffect(() => {
    const channel = supabase
      .channel(`list-products-${listId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `list_id=eq.${listId}`,
        },
        refresh
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [listId, supabase, refresh])
}
