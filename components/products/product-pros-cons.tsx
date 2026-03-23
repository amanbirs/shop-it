import { Check, X } from "lucide-react"

type ProductProsConsProps = {
  pros: string[]
  cons: string[]
}

export function ProductProsCons({ pros, cons }: ProductProsConsProps) {
  if (pros.length === 0 && cons.length === 0) {
    return <p className="text-sm text-muted-foreground">No pros/cons available</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {pros.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wider text-purchased">
            Pros
          </h4>
          <ul className="space-y-1.5">
            {pros.map((pro, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 mt-0.5 text-purchased" />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {cons.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wider text-destructive">
            Cons
          </h4>
          <ul className="space-y-1.5">
            {cons.map((con, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <X className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
