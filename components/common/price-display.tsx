import { formatPriceRange } from "@/lib/utils"

type PriceDisplayProps = {
  min: number | null
  max: number | null
  currency?: string
  note?: string | null
  className?: string
}

export function PriceDisplay({
  min,
  max,
  currency = "INR",
  note,
  className,
}: PriceDisplayProps) {
  const price = formatPriceRange(min, max, currency)

  return (
    <div className={className}>
      <span className="font-semibold">{price}</span>
      {note && (
        <span className="ml-1.5 text-xs text-muted-foreground">
          · {note}
        </span>
      )}
    </div>
  )
}
