"use client"

import { cn } from "@/lib/utils"

type DotRatingProps = {
  score: number
  max?: number
  className?: string
}

export function DotRating({ score, max = 5, className }: DotRatingProps) {
  return (
    <span
      role="img"
      aria-label={`${score} out of ${max}`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            i < score ? "bg-foreground" : "bg-muted-foreground/30"
          )}
        />
      ))}
    </span>
  )
}
