export const PREVIEW_SERVICES = [
  "gelcoat-restoration",
  "boat-detailing",
  "interior-detailing",
  "ceramic-coating",
  "graphene-coating",
  "wet-sanding",
  "bottom-painting",
  "vinyl-removal",
] as const;

export type PreviewService = (typeof PREVIEW_SERVICES)[number];

const BASE_PROMPT = `Edit the uploaded boat photo to simulate professionally completed marine service work. The result should look realistic, natural, and achievable — preserving the boat's exact shape, angle, marina or waterfront background, lighting conditions, and overall scene realism. Do not add artificial elements, change the environment significantly, or over-render the image.`;

const SERVICE_PROMPTS: Record<PreviewService, string> = {
  "gelcoat-restoration": `${BASE_PROMPT} Apply professional gelcoat restoration: remove oxidation and chalkiness, restore depth and gloss, enhance reflections while maintaining a natural weathered-to-improved transition.`,
  "boat-detailing": `${BASE_PROMPT} Apply professional exterior detailing: clean visible staining and water spots, brighten surfaces, improve clarity and finish, restore a fresh detailed appearance while keeping the boat's original character.`,
  "interior-detailing": `${BASE_PROMPT} Apply professional interior detailing: clean and refresh vinyl surfaces, brighten upholstery and cushions, remove signs of wear and mildew, create a premium maintained cabin appearance.`,
  "ceramic-coating": `${BASE_PROMPT} Apply professional ceramic coating: create deeper gloss and sharper reflections, enhance surface clarity, add a premium protected appearance with realistic water-beading qualities while preserving the original scene.`,
  "graphene-coating": `${BASE_PROMPT} Apply professional graphene nano coating: create enhanced gloss with stronger reflections, achieve a darker richer tone, add superior hydrophobic properties and protected appearance while maintaining scene realism.`,
  "wet-sanding": `${BASE_PROMPT} Apply professional wet sanding and paint correction: reduce visible oxidation, haze, swirl marks, and dullness, restore gloss and clarity with realistic improvement in surface finish quality.`,
  "bottom-painting": `${BASE_PROMPT} Apply professional bottom paint: show a clean fresh anti-fouling bottom coating application with realistic color and coverage while preserving the boat's above-waterline appearance.`,
  "vinyl-removal": `${BASE_PROMPT} Apply professional vinyl update: either remove old worn graphics cleanly or apply fresh premium vinyl striping/names/decals, creating a cleaner updated appearance while preserving the boat's realistic overall look.`,
};

const SERVICE_META: Record<
  PreviewService,
  {
    title: string;
    subtitle: string;
    ctaLabel: string;
  }
> = {
  "gelcoat-restoration": {
    title: "Gelcoat Restoration",
    subtitle: "What restored gelcoat looks like",
    ctaLabel: "Get Gelcoat Restoration",
  },
  "boat-detailing": {
    title: "Exterior Detailing",
    subtitle: "What a detailed exterior looks like",
    ctaLabel: "Get Exterior Detailing",
  },
  "interior-detailing": {
    title: "Interior Detailing",
    subtitle: "What a refreshed interior looks like",
    ctaLabel: "Get Interior Detailing",
  },
  "ceramic-coating": {
    title: "Ceramic Coating",
    subtitle: "What ceramic-coated protection looks like",
    ctaLabel: "Get Ceramic Coating",
  },
  "graphene-coating": {
    title: "Graphene Nano Coating",
    subtitle: "What graphene protection looks like",
    ctaLabel: "Get Graphene Coating",
  },
  "wet-sanding": {
    title: "Wet Sanding / Paint Correction",
    subtitle: "What corrected paint looks like",
    ctaLabel: "Get Paint Correction",
  },
  "bottom-painting": {
    title: "Bottom Painting",
    subtitle: "What fresh bottom paint looks like",
    ctaLabel: "Get Bottom Painting",
  },
  "vinyl-removal": {
    title: "Vinyl Removal / Installation",
    subtitle: "What updated vinyl looks like",
    ctaLabel: "Get Vinyl Service",
  },
};

export function isValidPreviewService(service: string): service is PreviewService {
  return PREVIEW_SERVICES.includes(service as PreviewService);
}

export function getPreviewPrompt(service: PreviewService): string {
  return SERVICE_PROMPTS[service];
}

export function getPreviewMeta(service: PreviewService) {
  return SERVICE_META[service];
}

export function getAllPreviewServices(): PreviewService[] {
  return [...PREVIEW_SERVICES];
}
