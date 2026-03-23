"use client"

import { useTransition } from "react"
import { Star, CheckCircle2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { toggleShortlist, markPurchased, archiveProduct } from "@/lib/actions/products"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type ProductActionsProps = {
  productId: string
  isShortlisted: boolean
  isPurchased: boolean
  canEdit: boolean
}

export function ProductActions({
  productId,
  isShortlisted,
  isPurchased,
  canEdit,
}: ProductActionsProps) {
  const [isPending, startTransition] = useTransition()

  if (!canEdit) return null

  const handleShortlist = () => {
    startTransition(async () => {
      const result = await toggleShortlist({
        productId,
        isShortlisted: !isShortlisted,
      })
      if (!result.success) toast.error(result.error.message)
    })
  }

  const handlePurchased = () => {
    startTransition(async () => {
      const result = await markPurchased({
        productId,
        isPurchased: !isPurchased,
      })
      if (!result.success) toast.error(result.error.message)
    })
  }

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archiveProduct({ productId })
      if (!result.success) {
        toast.error(result.error.message)
      } else {
        toast.success("Product removed from list")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isShortlisted ? "default" : "outline"}
        size="sm"
        onClick={handleShortlist}
        disabled={isPending}
        className={cn(
          isShortlisted && "bg-shortlisted hover:bg-shortlisted/90 text-white"
        )}
      >
        <Star
          className={cn(
            "h-4 w-4 mr-1.5",
            isShortlisted && "fill-current"
          )}
        />
        {isShortlisted ? "Shortlisted" : "Shortlist"}
      </Button>

      <Button
        variant={isPurchased ? "default" : "outline"}
        size="sm"
        onClick={handlePurchased}
        disabled={isPending}
        className={cn(
          isPurchased && "bg-purchased hover:bg-purchased/90 text-white"
        )}
      >
        <CheckCircle2
          className={cn(
            "h-4 w-4 mr-1.5",
            isPurchased && "fill-current"
          )}
        />
        {isPurchased ? "Purchased" : "Mark Purchased"}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the product from the list. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
