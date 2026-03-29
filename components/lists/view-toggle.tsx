"use client"

import { LayoutGrid, Table2, Columns3 } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export type ViewMode = "grid" | "table" | "specs"

type ViewToggleProps = {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

const views: { value: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { value: "grid", label: "Grid view", icon: LayoutGrid },
  { value: "table", label: "Table view", icon: Table2 },
  { value: "specs", label: "Spec comparison", icon: Columns3 },
]

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(newValue: (string | number)[]) => {
        const val = newValue[0]
        if (typeof val === "string" && (val === "grid" || val === "table" || val === "specs")) {
          onChange(val)
        }
      }}
      variant="outline"
      size="sm"
      aria-label="View mode"
    >
      {views.map((v) => (
        <Tooltip key={v.value}>
          <TooltipTrigger
            render={
              <ToggleGroupItem
                value={v.value}
                aria-label={v.label}
              />
            }
          >
            <v.icon className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>{v.label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  )
}
