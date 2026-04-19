import { NextResponse } from "next/server";

import {
  isValidPreviewService,
  getPreviewPrompt,
  getAllPreviewServices,
} from "@/lib/preview-prompts";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models";

const PRIMARY_IMAGE_MODEL = "gemini-2.5-flash-image";
const FALLBACK_IMAGE_MODEL = "gemini-3.1-flash-image-preview";

const VALID_IMAGE_MODELS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
] as const;

const KNOWN_BAD_MODELS = [
  "gemini-2.0-flash-preview-image-generation",
  "gemini-1.5-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.0-pro-exp",
  "gemini-3.0-flash-exp",
];

function isValidImageModel(model: string): model is (typeof VALID_IMAGE_MODELS)[number] {
  return (VALID_IMAGE_MODELS as readonly string[]).includes(model);
}

function getEffectiveModel(): string {
  const envModel = process.env.GEMINI_IMAGE_MODEL;
  if (envModel && isValidImageModel(envModel)) {
    console.log("[Boat Preview] Using env model:", envModel);
    return envModel;
  }
  if (envModel && KNOWN_BAD_MODELS.includes(envModel)) {
    console.warn(`[Boat Preview] Env model "${envModel}" is not valid for image generation. Using ${PRIMARY_IMAGE_MODEL} instead.`);
  } else if (envModel) {
    console.warn(`[Boat Preview] Env model "${envModel}" is unsupported. Allowed image models: ${VALID_IMAGE_MODELS.join(", ")}. Using ${PRIMARY_IMAGE_MODEL}.`);
  }
  console.log("[Boat Preview] Using default model:", PRIMARY_IMAGE_MODEL);
  return PRIMARY_IMAGE_MODEL;
}

async function compressImage(base64: string, _maxWidth = 1024): Promise<string> {
  return base64;
}

interface GenerateContentResult {
  success: boolean;
  image?: string;
  error?: string;
  modelUsed?: string;
  partTypes?: string[];
}

async function generatePreviewWithModel(
  model: string,
  prompt: string,
  imageData: string,
  apiKey: string
): Promise<GenerateContentResult> {
  console.log("[Boat Preview] Attempting with model:", model);

  const geminiRequest: Record<string, unknown> = {
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
  };

  console.log("[Boat Preview] Request payload fields:", Object.keys(geminiRequest));

  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(geminiRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Boat Preview] ${model} API error status:`, response.status);
    console.error(`[Boat Preview] ${model} API error body:`, errorText);
    return { success: false, error: "Gemini API error", modelUsed: model };
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts) {
    console.error("[Boat Preview] Invalid response structure from", model);
    return { success: false, error: "Invalid response structure", modelUsed: model };
  }

  const parts = data.candidates[0].content.parts;
  const partTypes = parts.map((p: { inlineData?: unknown; text?: unknown }) => p.inlineData ? "image" : "text");
  const hasInlineImageData = parts.some((part: { inlineData?: unknown }) => Boolean(part.inlineData));

  console.log("[Boat Preview] Response from", model + ":");
  console.log("- Parts count:", parts.length);
  console.log("- Part types:", partTypes);
  console.log("- Has inline image data:", hasInlineImageData);

  const imagePart = parts.find(
    (part: { inlineData?: { mimeType: string; data: string } }) => part.inlineData
  );

  if (imagePart) {
    console.log("[Boat Preview] Image generated successfully with", model, "- size:", imagePart.inlineData.data.length, "chars");
    return {
      success: true,
      image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
      modelUsed: model,
      partTypes,
    };
  }

  const textPart = parts.find((part: { text?: string }) => part.text);
  if (textPart) {
    console.log("[Boat Preview]", model, "returned text only:", (textPart as { text: string }).text.slice(0, 200));
  }

  return { success: false, error: "No image in response", modelUsed: model, partTypes };
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

    const model = getEffectiveModel();
    const prompt = getPreviewPrompt(service);
    const compressedImage = await compressImage(imageBase64);

    const imageData = compressedImage.includes(",")
      ? compressedImage.split(",")[1]
      : compressedImage;

    console.log("[Boat Preview] ========== REQUEST START ==========");
    console.log("[Boat Preview] Service:", service);
    console.log("[Boat Preview] Model:", model);
    console.log("[Boat Preview] Prompt length:", prompt.length, "chars");
    console.log("[Boat Preview] Image data length:", imageData.length, "chars");
    console.log("[Boat Preview] ===================================");

    let result = await generatePreviewWithModel(model, prompt, imageData, apiKey);

    if (!result.success && model !== FALLBACK_IMAGE_MODEL) {
      console.log("[Boat Preview] Initial model failed, trying fallback...");
      result = await generatePreviewWithModel(FALLBACK_IMAGE_MODEL, prompt, imageData, apiKey);
    }

    if (result.success && result.image) {
      return NextResponse.json({
        success: true,
        image: result.image,
        modelUsed: result.modelUsed,
      });
    }

    console.log("[Boat Preview] All models failed to generate image");
    return NextResponse.json(
      {
        success: false,
        error: "Image preview could not be generated right now. Please try again.",
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("[Boat Preview] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Image preview could not be generated right now. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    availableServices: getAllPreviewServices(),
    primaryModel: PRIMARY_IMAGE_MODEL,
    fallbackModel: FALLBACK_IMAGE_MODEL,
    validImageModels: VALID_IMAGE_MODELS,
  });
}
