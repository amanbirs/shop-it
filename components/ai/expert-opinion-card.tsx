import { Trophy, Coins, AlertTriangle, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { relativeTime } from "@/lib/utils"
import type { ListAiOpinion } from "@/lib/types/database"

type ExpertOpinionCardProps = {
  opinion: ListAiOpinion
  productNames: Record<string, string>
}

export function ExpertOpinionCard({
  opinion,
  productNames,
}: ExpertOpinionCardProps) {
  return (
    <Card className="border-ai-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-ai-accent" />
          AI Expert Opinion
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Generated from {opinion.product_count} products ·{" "}
          {relativeTime(opinion.generated_at)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Top Pick */}
        {opinion.top_pick && (
          <div className="rounded-lg border border-ai-accent/20 bg-ai-accent/5 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="h-4 w-4 text-ai-accent" />
              Top Pick: {productNames[opinion.top_pick] ?? "Unknown"}
            </div>
            {opinion.top_pick_reason && (
              <p className="text-sm text-muted-foreground">
                {opinion.top_pick_reason}
              </p>
            )}
          </div>
        )}

        {/* Value Pick */}
        {opinion.value_pick && (
          <div className="rounded-lg border border-purchased/20 bg-purchased/5 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Coins className="h-4 w-4 text-purchased" />
              Value Pick: {productNames[opinion.value_pick] ?? "Unknown"}
            </div>
            {opinion.value_pick_reason && (
              <p className="text-sm text-muted-foreground">
                {opinion.value_pick_reason}
              </p>
            )}
          </div>
        )}

        {/* Summary */}
        {opinion.summary && (
          <div>
            <h4 className="text-sm font-medium mb-1">Summary</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {opinion.summary}
            </p>
          </div>
        )}

        {/* Comparison */}
        {opinion.comparison && (
          <div>
            <h4 className="text-sm font-medium mb-1">Comparison</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {opinion.comparison}
            </p>
          </div>
        )}

        <Separator />

        {/* Concerns */}
        {opinion.concerns && (
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-extraction-pending shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium mb-1">Concerns</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {opinion.concerns}
              </p>
            </div>
          </div>
        )}

        {/* Verdict */}
        {opinion.verdict && (
          <div className="rounded-lg bg-muted/50 p-3">
            <h4 className="text-sm font-medium mb-1">Verdict</h4>
            <p className="text-sm leading-relaxed">{opinion.verdict}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
