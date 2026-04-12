import { company } from "@/content/site";

type PlaceIdResult = {
  placeId: string | null;
  name: string | null;
  success: boolean;
  error?: string;
};

async function lookupPlaceId(): Promise<PlaceIdResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return {
      placeId: null,
      name: null,
      success: false,
      error: "Missing GOOGLE_MAPS_API_KEY environment variable",
    };
  }

  const query = `${company.name} ${company.addressLocality} ${company.addressRegion}`;
  const encodedQuery = encodeURIComponent(query);

  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedQuery}&inputtype=textquery&fields=place_id,name&key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        placeId: null,
        name: null,
        success: false,
        error: `HTTP error: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.candidates || data.candidates.length === 0) {
      return {
        placeId: null,
        name: null,
        success: false,
        error: `API returned status: ${data.status}`,
      };
    }

    const candidate = data.candidates[0];

    return {
      placeId: candidate.place_id,
      name: candidate.name,
      success: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      placeId: null,
      name: null,
      success: false,
      error: message,
    };
  }
}

async function main() {
  console.log(`Looking up Place ID for: ${company.name}...\n`);

  const result = await lookupPlaceId();

  if (result.success && result.placeId) {
    console.log("SUCCESS:");
    console.log(JSON.stringify({ placeId: result.placeId, name: result.name }, null, 2));
    console.log("\nAdd this to your environment:");
    console.log(`GOOGLE_PLACE_ID=${result.placeId}`);
  } else {
    console.log("FAILED:", result.error);
    process.exit(1);
  }
}

main();
