import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getGoogleTrustData, type GoogleReview, type GoogleTrustData } from "@/lib/google-reviews";

type Review = GoogleReview;
type TrustData = GoogleTrustData;

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= rounded ? "fill-primary text-primary" : "fill-white/10 text-white/20"}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex flex-col rounded-[1.5rem] border border-white/10 bg-black p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {review.authorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-white">{review.authorName}</p>
          {review.relativeTime && <p className="text-xs text-white/45">{review.relativeTime} · Google</p>}
        </div>
      </div>
      <div className="mb-3">
        <StarRating rating={review.rating} size={14} />
      </div>
      <p className="line-clamp-6 text-sm leading-relaxed text-white/75">{review.text}</p>
    </div>
  );
}

function TrustBadge({ data }: { data: TrustData }) {
  return (
    <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-6 py-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:px-10 md:py-12">
      <div className="flex flex-col items-center gap-5">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-primary" aria-hidden="true">
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
          </svg>
          Google Rating
        </div>

        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <span className="text-6xl font-black tracking-tight text-white md:text-7xl">{data.rating.toFixed(1)}</span>
          <div className="flex flex-col items-center gap-2 md:items-start">
            <StarRating rating={data.rating} size={22} />
            <p className="text-sm font-medium text-white/64">
              Based on {data.reviewCount}
              {data.live ? "" : "+"} verified Google reviews
            </p>
          </div>
        </div>

        <p className="max-w-2xl text-sm leading-7 text-white/60 md:text-base">
          Trusted by boat owners looking for dependable dockside service, premium finish work, and results that hold up all season.
        </p>
      </div>
    </div>
  );
}

export function TrustSection({ data }: { data: TrustData }) {
  const reviews = data.reviews.slice(0, 3);

  return (
    <section className="bg-neutral-950 py-20 md:py-28">
      <div className="page-shell">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">CUSTOMER REVIEWS</p>
          <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">Don&apos;t just take our word for it.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/62 md:text-lg">
            We are built on doing good work and treating people right. The reviews kind of speak for themselves.
          </p>
        </div>

        <div className="mt-12">
          <TrustBadge data={data} />
        </div>

        {reviews.length > 0 && (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {reviews.map((review, index) => (
              <ReviewCard key={`${review.authorName}-${index}`} review={review} />
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              variant="outline"
              className="h-11 border-white/20 bg-white/5 px-7 text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              <a href={data.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                Read All Reviews
              </a>
            </Button>
            <Button asChild className="h-11 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
              <a href={data.leaveReviewUrl} target="_blank" rel="noopener noreferrer">
                Leave a Review
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Server component: pulls the live Google Business Profile data (cached 6h). */
export async function GoogleReviewsSection() {
  const data = await getGoogleTrustData();
  return <TrustSection data={data} />;
}

export type { Review, TrustData };
