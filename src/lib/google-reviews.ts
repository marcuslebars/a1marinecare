// Google Business Profile rating + reviews, pulled live from the Places API
// (New) and cached. Server-only — the API key never reaches the browser.
//
// Falls back to the static numbers below when GOOGLE_PLACE_ID / the key are
// missing or Google errors, so the reviews section never breaks a deploy.
//
// Setup (one-time):
//   1. Google Cloud → the project that owns GOOGLE_MAPS_API_KEY → enable
//      Billing, then enable "Places API (New)". Free tier covers ~10k
//      details calls/month; this site makes ~4/day per instance.
//   2. `npm run lookup:place-id` (or find it at
//      https://developers.google.com/maps/documentation/places/web-service/place-id)
//      and set GOOGLE_PLACE_ID on Railway.
//
// Cache: 6 hours via Next's fetch revalidation. A new review shows up on the
// site within 6 hours of landing on Google.

import { company } from "@/content/site";

export type GoogleReview = {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
};

export type GoogleTrustData = {
  rating: number;
  reviewCount: number;
  reviews: GoogleReview[];
  googleMapsUrl: string;
  leaveReviewUrl: string;
  /** true when the numbers came from Google on this render (or the cache). */
  live: boolean;
};

export const REVIEWS_REVALIDATE_SECONDS = 6 * 60 * 60;

const STATIC_FALLBACK: GoogleTrustData = {
  rating: 5.0,
  reviewCount: 12,
  reviews: [],
  googleMapsUrl: `https://www.google.com/search?q=${encodeURIComponent(`${company.name} ${company.addressLocality} ${company.addressRegion}`)}`,
  leaveReviewUrl: `https://www.google.com/search?q=${encodeURIComponent(`${company.name} reviews`)}`,
  live: false,
};

type PlacesDetailsResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: Array<{
    rating?: number;
    relativePublishTimeDescription?: string;
    publishTime?: string;
    text?: { text?: string; languageCode?: string };
    authorAttribution?: { displayName?: string };
  }>;
};

export async function getGoogleTrustData(): Promise<GoogleTrustData> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();

  if (!apiKey || !placeId) {
    return STATIC_FALLBACK;
  }

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "rating,userRatingCount,googleMapsUri,reviews.rating,reviews.text,reviews.authorAttribution.displayName,reviews.relativePublishTimeDescription,reviews.publishTime",
      },
      next: { revalidate: REVIEWS_REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[google-reviews] Places API ${res.status}: ${body.slice(0, 300)}`);
      return STATIC_FALLBACK;
    }

    const data = (await res.json()) as PlacesDetailsResponse;

    const reviews: GoogleReview[] = (data.reviews ?? [])
      .filter((r) => (r.rating ?? 0) >= 4 && (r.text?.text ?? "").trim().length > 0)
      .map((r) => ({
        authorName: r.authorAttribution?.displayName?.trim() || "Google user",
        rating: r.rating ?? 5,
        text: r.text?.text?.trim() ?? "",
        relativeTime: r.relativePublishTimeDescription ?? "",
        publishTime: r.publishTime ?? "",
      }))
      .sort((a, b) => (b.publishTime > a.publishTime ? 1 : b.publishTime < a.publishTime ? -1 : 0));

    return {
      rating: typeof data.rating === "number" ? data.rating : STATIC_FALLBACK.rating,
      reviewCount: typeof data.userRatingCount === "number" ? data.userRatingCount : STATIC_FALLBACK.reviewCount,
      reviews,
      googleMapsUrl: data.googleMapsUri || STATIC_FALLBACK.googleMapsUrl,
      leaveReviewUrl: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
      live: true,
    };
  } catch (err) {
    console.error("[google-reviews] fetch failed:", err instanceof Error ? err.message : String(err));
    return STATIC_FALLBACK;
  }
}
