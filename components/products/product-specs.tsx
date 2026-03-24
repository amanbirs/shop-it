type ProductSpecsProps = {
  specs: Record<string, string>
}

function formatSpecKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ProductSpecs({ specs }: ProductSpecsProps) {
  const entries = Object.entries(specs)
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No specs available</p>
  }

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <span className="text-muted-foreground">{formatSpecKey(key)}</span>
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}
