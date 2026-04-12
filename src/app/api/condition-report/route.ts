import { NextResponse } from "next/server";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export type ConditionReport = {
  oxidationLevel: "low" | "moderate" | "heavy";
  glossLevel: "low" | "fair" | "strong";
  cleanlinessLevel: "poor" | "fair" | "good";
  likelyIssues: string[];
  recommendedServices: string[];
  confidenceNote: string;
  summary: string;
};

const ANALYSIS_PROMPT = `You are an expert marine detailing and boat condition analyst. Analyze the uploaded boat image and provide a detailed, honest condition assessment.

Return your analysis as a JSON object with EXACTLY this structure — no markdown, no code blocks, just pure JSON:
{
  "oxidationLevel": "low" | "moderate" | "heavy",
  "glossLevel": "low" | "fair" | "strong",
  "cleanlinessLevel": "poor" | "fair" | "good",
  "likelyIssues": ["issue1", "issue2", ...],
  "recommendedServices": ["service-slug-1", "service-slug-2", ...],
  "confidenceNote": "A brief note about the confidence of this assessment based on image quality and visible areas.",
  "summary": "A 2-3 sentence overall summary of the boat's current condition and priority concerns."
}

Service slugs for recommendedServices (pick the most relevant):
- boat-detailing (general cleaning and surface refresh)
- gelcoat-restoration (for moderate to heavy oxidation, chalky surfaces)
- ceramic-coating (for fair gloss wanting long-term protection)
- graphene-coating (for strong protection needs, premium durability)
- interior-detailing (for cabin, vinyl, upholstery concerns)
- wet-sanding (for heavy oxidation, deep scratches, swirl marks)
- bottom-painting (for hull bottom fouling or anti-fouling needs)
- vinyl-removal (for old graphics, striping, or name changes)

Be honest and specific. If areas are not visible in the image, note that in confidenceNote. Focus on what's actually visible.`;

function parseJSONResponse(text: string): ConditionReport | null {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (
      parsed &&
      typeof parsed === "object" &&
      ["low", "moderate", "heavy"].includes(parsed.oxidationLevel) &&
      ["low", "fair", "strong"].includes(parsed.glossLevel) &&
      ["poor", "fair", "good"].includes(parsed.cleanlinessLevel) &&
      Array.isArray(parsed.likelyIssues) &&
      Array.isArray(parsed.recommendedServices) &&
      typeof parsed.confidenceNote === "string" &&
      typeof parsed.summary === "string"
    ) {
      return parsed as ConditionReport;
    }
  } catch {
    return null;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageBase64 = formData.get("image") as string;
    const serviceContext = (formData.get("service") as string) || null;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API not configured" },
        { status: 500 }
      );
    }

    const model = process.env.GEMINI_VISION_MODEL || "gemini-1.5-flash";
    const prompt = serviceContext
      ? `${ANALYSIS_PROMPT}\n\nThe user is specifically interested in: ${serviceContext}`
      : ANALYSIS_PROMPT;

    const imageData = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    console.log("[Condition Report] Request details:");
    console.log("- Service context:", serviceContext || "none");
    console.log("- Model:", model);
    console.log("- Prompt length:", prompt.length, "chars");
    console.log("- Image data length:", imageData.length, "chars");

    const geminiRequest = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageData,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Condition Report] Gemini API error:", response.status, errorText);
      return NextResponse.json(
        { success: false, error: "Failed to analyze image. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("[Condition Report] Invalid response structure:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { success: false, error: "Invalid response from Gemini" },
        { status: 500 }
      );
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    console.log("[Condition Report] Raw response:", textResponse.slice(0, 200));

    const report = parseJSONResponse(textResponse);

    if (!report) {
      console.error("[Condition Report] Failed to parse JSON response");
      return NextResponse.json(
        { success: false, error: "Failed to parse analysis results. Please try again." },
        { status: 500 }
      );
    }

    console.log("[Condition Report] Successfully parsed condition report");
    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("[Condition Report] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
