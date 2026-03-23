import { Star } from "lucide-react"
import type { ScrapedReview } from "@/lib/types/database"

type ProductReviewsProps = {
  aiReviewSummary: string | null
  scrapedReviews: ScrapedReview[]
}

export function ProductReviews({
  aiReviewSummary,
  scrapedReviews,
}: ProductReviewsProps) {
  if (!aiReviewSummary && scrapedReviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews available</p>
  }

  return (
    <div className="space-y-4">
      {aiReviewSummary && (
        <div className="text-sm leading-relaxed border-l-2 border-ai-accent/30 pl-3">
          {aiReviewSummary}
        </div>
      )}

      {scrapedReviews.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Review excerpts
          </h4>
          {scrapedReviews.map((review, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                {review.rating != null && (
                  <span className="flex items-center gap-0.5 text-xs">
                    {Array.from({ length: 5 }, (_, j) => (
                      <Star
                        key={j}
                        className={`h-3 w-3 ${
                          j < review.rating!
                            ? "fill-shortlisted text-shortlisted"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </span>
                )}
                {review.source && (
                  <span className="text-xs text-muted-foreground">
                    {review.source}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground italic">
                &ldquo;{review.snippet}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
