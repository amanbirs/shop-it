"use client"

import { cn } from "@/lib/utils"

export type FilterValue = "all" | "shortlisted" | "purchased"

type ListFiltersProps = {
  active: FilterValue
  onChange: (filter: FilterValue) => void
  counts: {
    all: number
    shortlisted: number
    purchased: number
  }
}

const filters: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "purchased", label: "Purchased" },
]

export function ListFilters({ active, onChange, counts }: ListFiltersProps) {
  return (
    <div className="flex gap-1" role="tablist" aria-label="Product filters">
      {filters.map((f) => {
        const count = counts[f.value]
        const isActive = active === f.value
        return (
          <button
            key={f.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {f.label} ({count})
          </button>
        )
      })}
    </div>
  )
}
