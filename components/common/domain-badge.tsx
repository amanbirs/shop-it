import { Globe } from "lucide-react"

type DomainBadgeProps = {
  domain: string | null
  className?: string
}

export function DomainBadge({ domain, className }: DomainBadgeProps) {
  if (!domain) return null

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className ?? ""}`}>
      <Globe className="h-3 w-3" />
      {domain}
    </span>
  )
}
