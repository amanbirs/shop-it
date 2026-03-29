import { Check, Globe } from "lucide-react"

type SpecLegendProps = {
  generatedAt: string
  modelVersion: string | null
}

export function SpecLegend({ generatedAt, modelVersion }: SpecLegendProps) {
  const date = new Date(generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Check className="h-3 w-3 text-emerald-500" />
        = best in spec
      </span>
      <span className="inline-flex items-center gap-1">
        <Globe className="h-3 w-3 text-blue-500 dark:text-blue-400" />
        = uses external knowledge
      </span>
      <span>
        Generated {date}
        {modelVersion ? ` via ${modelVersion.replace("gemini-", "Gemini ").replace("-preview", "")}` : ""}
      </span>
    </div>
  )
}
