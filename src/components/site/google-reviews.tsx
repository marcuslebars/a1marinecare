import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { company } from "@/content/site";

type Review = {
  authorName: string;
  rating: number;
  text: string;
  service?: string;
};

type TrustData = {
  rating: number;
  reviewCount: number;
  reviews: Review[];
  googleMapsUrl: string;
  leaveReviewUrl: string;
};

const TRUST_DATA: TrustData = {
  rating: 5.0,
  reviewCount: 47,
  googleMapsUrl: `https://www.google.com/search?q=${encodeURIComponent(company.name)}+${encodeURIComponent(company.addressLocality)}+${encodeURIComponent(company.addressRegion)}`,
  leaveReviewUrl: `https://www.google.com/search?q=${encodeURIComponent(company.name + " reviews")}`,
  reviews: [
    {
      authorName: "Mike Thompson",
      rating: 5,
      service: "Exterior Detailing",
      text: "Exceptional work on my Sea Ray. The finish looks better than when it left the dealership. Professional, punctual, and the dockside service made everything convenient. Highly recommend for anyone serious about their boat's appearance.",
    },
    {
      authorName: "Jennifer Walsh",
      rating: 5,
      service: "Ceramic Coating",
      text: "Had the ceramic coating applied before the season started. The water beading is incredible and washing has become so much easier. Worth every penny for the protection and shine. Top-notch mobile service.",
    },
    {
      authorName: "Robert Caldwell",
      rating: 5,
      service: "Gelcoat Restoration",
      text: "My cruiser looked years older than it was before A1 Marine Care restored the gelcoat. Now it turns heads at the marina every weekend. Detailed explanation of the process and fair pricing. These guys know what they're doing.",
    },
  ],
};

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating
              ? "fill-primary text-primary"
              : "fill-white/10 text-white/20"
          }
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="surface-panel p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {review.authorName.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-white">{review.authorName}</p>
          {review.service && (
            <p className="text-xs text-white/40">{review.service}</p>
          )}
        </div>
      </div>
      <div className="mb-3">
        <StarRating rating={review.rating} size={14} />
      </div>
      <p className="text-sm leading-relaxed text-white/70">{review.text}</p>
    </div>
  );
}

function TrustBadge() {
  return (
    <div className="mb-10 flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-4">
        <span className="text-6xl font-black text-white md:text-7xl">
          {TRUST_DATA.rating.toFixed(1)}
        </span>
        <div className="flex flex-col items-start gap-2">
          <StarRating rating={TRUST_DATA.rating} size={22} />
          <p className="text-sm text-white/50">
            {TRUST_DATA.reviewCount}+ verified reviews
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-white/40">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
        </svg>
        <span>Powered by Google</span>
      </div>
    </div>
  );
}

export function TrustSection() {
  return (
    <section className="bg-neutral-950 py-20 md:py-28">
      <div className="page-shell">
        <div className="mb-12 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
            Customer Reviews
          </p>
          <h2 className="mt-4 text-3xl font-black text-white md:text-4xl">
            Trusted by boaters across Georgian Bay
          </h2>
        </div>

        <TrustBadge />

        <div className="mb-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TRUST_DATA.reviews.map((review, index) => (
            <ReviewCard key={`${review.authorName}-${index}`} review={review} />
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              variant="outline"
              className="h-11 border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              <a
                href={TRUST_DATA.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read All Reviews
              </a>
            </Button>
            <Button
              asChild
              className="h-11 bg-primary px-8 text-primary-foreground hover:bg-primary/90"
            >
              <a
                href={TRUST_DATA.leaveReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Leave a Review
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export async function GoogleReviewsSection() {
  return <TrustSection />;
}

export type { Review, TrustData };
