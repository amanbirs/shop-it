"use client"

import { Loader2, AlertCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ExtractionStatus } from "@/lib/types/database"

type ExtractionProgressProps = {
  status: ExtractionStatus
  error?: string | null
  onRetry?: () => void
}

export function ExtractionProgress({
  status,
  error,
  onRetry,
}: ExtractionProgressProps) {
  if (status === "completed") return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs px-3 py-2 rounded-md",
        status === "pending" && "bg-extraction-pending/10 text-extraction-pending",
        status === "processing" && "bg-muted text-muted-foreground",
        status === "failed" && "bg-destructive/10 text-destructive"
      )}
    >
      {status === "pending" && (
        <>
          <Clock className="h-3.5 w-3.5" />
          <span>Waiting to extract...</span>
        </>
      )}
      {status === "processing" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Extracting data...</span>
        </>
      )}
      {status === "failed" && (
        <>
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="flex-1 truncate">{error || "Extraction failed"}</span>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  )
}
