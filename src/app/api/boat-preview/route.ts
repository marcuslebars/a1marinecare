import { NextResponse } from "next/server";

import {
  isValidPreviewService,
  getPreviewPrompt,
  getAllPreviewServices,
} from "@/lib/preview-prompts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function compressImage(base64: string, _maxWidth = 1024): Promise<string> {
  return base64;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageBase64 = formData.get("image") as string;
    const service = formData.get("service") as string;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    if (!service || !isValidPreviewService(service)) {
      return NextResponse.json(
        { success: false, error: "Invalid service selection" },
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

    const model =
      process.env.GEMINI_IMAGE_MODEL || "gemini-2.0-flash-preview-image-generation";
    const prompt = getPreviewPrompt(service);
    const compressedImage = await compressImage(imageBase64);

    const imageData = compressedImage.includes(",")
      ? compressedImage.split(",")[1]
      : compressedImage;

    console.log("[Boat Preview] Request details:");
    console.log("- Service:", service);
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
        responseModalities: ["TEXT", "IMAGE"],
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
      console.error("[Boat Preview] Gemini API error:", response.status, errorText);
      return NextResponse.json(
        { success: false, error: "Failed to generate preview. Please try again." },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts) {
      console.error("[Boat Preview] Invalid response structure:", JSON.stringify(data).slice(0, 500));
      return NextResponse.json(
        { success: false, error: "Invalid response from Gemini" },
        { status: 500 }
      );
    }

    const parts = data.candidates[0].content.parts;
    console.log("[Boat Preview] Response parts count:", parts.length);
    console.log("[Boat Preview] Part types:", parts.map((p: { inlineData?: unknown; text?: unknown }) => p.inlineData ? "image" : "text"));

    const imagePart = parts.find(
      (part: { inlineData?: { mimeType: string; data: string } }) => part.inlineData
    );

    const textPart = parts.find(
      (part: { text?: string }) => part.text
    );

    if (!imagePart) {
      if (textPart) {
        console.log("[Boat Preview] Gemini returned text only:", (textPart as { text: string }).text.slice(0, 200));
      }
      return NextResponse.json(
        {
          success: false,
          error: "Image generation failed. Please try a different photo or service.",
        },
        { status: 500 }
      );
    }

    console.log("[Boat Preview] Image successfully generated, size:", imagePart.inlineData.data.length, "chars");

    return NextResponse.json({
      success: true,
      image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    });
  } catch (error) {
    console.error("[Boat Preview] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    availableServices: getAllPreviewServices(),
  });
}
