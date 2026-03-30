"use client"

import { useState, useTransition } from "react"
import { Link2, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addProduct } from "@/lib/actions/products"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const URL_PATTERN = /^(https?:\/\/|www\.)/i

type AddProductFormProps = {
  listId: string
  onSearch?: (query: string) => void
}

export function AddProductForm({ listId, onSearch }: AddProductFormProps) {
  const [value, setValue] = useState("")
  const [isPending, startTransition] = useTransition()

  const isUrl = URL_PATTERN.test(value.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return

    if (isUrl) {
      // URL flow — add product directly
      startTransition(async () => {
        const url = trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed
        const result = await addProduct({ listId, url })

        if (!result.success) {
          toast.error(result.error.message)
          return
        }

        toast.success("Product added — extracting data...")
        setValue("")
      })
    } else {
      // Search flow — delegate to parent
      onSearch?.(trimmed)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        {isUrl ? (
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          type="text"
          placeholder="Paste a URL or search for products..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-9 text-base"
          disabled={isPending}
          aria-label="Product URL or search query"
        />
      </div>
      <Button type="submit" disabled={isPending || !value.trim()}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isUrl ? (
          "Add"
        ) : (
          "Search"
        )}
      </Button>
    </form>
  )
}
