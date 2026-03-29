"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type SpecStalenessAlertProps = {
  changedCount: number
  onRegenerate: () => void
  isRegenerating: boolean
}

export function SpecStalenessAlert({
  changedCount,
  onRegenerate,
  isRegenerating,
}: SpecStalenessAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="flex-1 text-amber-800 dark:text-amber-200">
        {changedCount} product{changedCount !== 1 ? "s" : ""} changed since last analysis
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
      >
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRegenerating ? "animate-spin" : ""}`} />
        {isRegenerating ? "Analyzing..." : "Regenerate"}
      </Button>
    </div>
  )
}
