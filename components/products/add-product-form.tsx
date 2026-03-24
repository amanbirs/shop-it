"use client"

import { useState, useTransition } from "react"
import { Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addProduct } from "@/lib/actions/products"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type AddProductFormProps = {
  listId: string
}

export function AddProductForm({ listId }: AddProductFormProps) {
  const [url, setUrl] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    startTransition(async () => {
      const result = await addProduct({ listId, url: url.trim() })

      if (!result.success) {
        toast.error(result.error.message)
        return
      }

      toast.success("Product added — extracting data...")
      setUrl("")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="url"
          placeholder="Paste a product URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="pl-9 text-base"
          disabled={isPending}
          aria-label="Product URL"
        />
      </div>
      <Button type="submit" disabled={isPending || !url.trim()}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
      </Button>
    </form>
  )
}
