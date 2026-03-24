import { Skeleton } from "@/components/ui/skeleton"

export default function ListDetailLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 shrink-0 space-y-3">
        {/* Header skeleton */}
        <div className="flex items-start gap-3">
          <Skeleton className="h-5 w-5 mt-1" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="flex-1 min-h-0 px-6">
        <div className="space-y-4 pb-6">
          {/* URL input skeleton */}
          <Skeleton className="h-10 w-full rounded-md" />
          {/* Filter tabs skeleton */}
          <div className="flex gap-1">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          {/* Product grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-40 w-full rounded-md" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
