"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, Sparkles, AlertCircle, Loader2, ArrowRight, ImageIcon, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { services } from "@/content/site";
import {
  PREVIEW_SERVICES,
  getPreviewMeta,
  type PreviewService,
} from "@/lib/preview-prompts";
import {
  ConditionReportDisplay,
  ConditionReportError,
} from "@/components/preview/condition-report";
import type { ConditionReport } from "@/app/api/condition-report/route";

const PREVIEW_SERVICE_MAP = services.filter((s) =>
  PREVIEW_SERVICES.includes(s.slug as PreviewService)
);

const UPLOAD_TIPS = [
  "Use a clear, well-lit photo of your boat",
  "Show the areas you'd like us to focus on",
  "Side angles or stern views work best",
  "Avoid blurry or heavily filtered photos",
];

type Mode = "preview" | "condition";

export function BoatPreviewForm() {
  const [mode, setMode] = useState<Mode>("preview");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedService, setSelectedService] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [conditionReport, setConditionReport] = useState<ConditionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [conditionLoading, setConditionLoading] = useState(false);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image too large. Please use an image under 10MB.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image too large. Please use an image under 10MB.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image || !selectedService || !imageFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("service", selectedService);

      const response = await fetch("/api/boat-preview", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to generate preview. Please try again.");
        return;
      }

      setResult(data.image);
    } catch {
      setError("Failed to generate preview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeCondition = async () => {
    if (!image || !imageFile) return;

    setConditionLoading(true);
    setConditionError(null);
    setConditionReport(null);

    try {
      const formData = new FormData();
      formData.append("image", image);
      if (selectedService) formData.append("service", selectedService);

      const response = await fetch("/api/condition-report", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        setConditionError(data.error || "Failed to analyze condition. Please try again.");
        return;
      }

      setConditionReport(data.report);
    } catch {
      setConditionError("Failed to analyze condition. Please try again.");
    } finally {
      setConditionLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImageFile(null);
    setSelectedService("");
    setResult(null);
    setConditionReport(null);
    setConditionError(null);
    setError(null);
  };

  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode);
    setResult(null);
    setConditionReport(null);
    setConditionError(null);
    setError(null);
  };

  const selectedServiceData = PREVIEW_SERVICE_MAP.find((s) => s.slug === selectedService);
  const serviceMeta = selectedService ? getPreviewMeta(selectedService as PreviewService) : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-2 p-1.5 rounded-xl bg-white/5 border border-white/10 w-fit mx-auto">
        <button
          onClick={() => handleModeSwitch("preview")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "preview"
              ? "bg-primary text-primary-foreground"
              : "text-white/60 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Visual Preview
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Upload Your Boat Photo</h3>
            <p className="text-sm text-white/50 mb-4">
              {mode === "preview"
                ? "JPG, PNG up to 10MB. Show the areas you want us to focus on."
                : "JPG, PNG up to 10MB. A clear, well-lit photo gives the most accurate assessment."}
            </p>
          </div>

          {!image ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="surface-panel border-2 border-dashed border-white/20 rounded-2xl p-12 text-center cursor-pointer hover:border-primary/40 hover:bg-white/5 transition-all duration-300"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-primary/60" />
              <p className="text-white/70 mb-1">Drag and drop your photo here</p>
              <p className="text-sm text-white/40">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden">
                <Image
                  src={image}
                  alt="Your boat"
                  width={600}
                  height={400}
                  className="w-full h-auto object-contain bg-neutral-900 rounded-xl"
                />
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/60 text-xs text-white/80 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Original Photo
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setImage(null);
                    setImageFile(null);
                    setResult(null);
                  }}
                  className="text-sm text-white/50 hover:text-white/80 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Remove photo
                </button>
                {imageFile && (
                  <span className="text-xs text-white/40">
                    {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs font-medium text-white/60 mb-3 uppercase tracking-wider">Best results with:</p>
            <ul className="space-y-1.5">
              {UPLOAD_TIPS.map((tip, i) => (
                <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                  <span className="text-primary/60 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {mode === "preview" && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Choose a Service</h3>
              <p className="text-sm text-white/50 mb-4">
                Select the service you&apos;re considering for your boat.
              </p>
              <select
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                  setResult(null);
                }}
                disabled={loading}
                className="w-full h-12 px-4 rounded-lg bg-neutral-800 border border-white/20 text-white appearance-none cursor-pointer focus:outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="">Select a service...</option>
                {PREVIEW_SERVICE_MAP.map((service) => (
                  <option key={service.slug} value={service.slug}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            onClick={mode === "preview" ? handleGenerate : handleAnalyzeCondition}
            disabled={
              !image ||
              (mode === "preview" ? !selectedService : false) ||
              loading ||
              conditionLoading
            }
            className="w-full h-14 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || conditionLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {mode === "preview" ? "Generating Preview..." : "Analyzing Condition..."}
              </>
            ) : mode === "preview" ? (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Preview
              </>
            ) : (
              <>
                <Scan className="w-5 h-5 mr-2" />
                Analyze Condition
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-destructive font-medium">Generation Failed</p>
                <p className="text-sm text-white/60 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {mode === "preview" ? "Preview Result" : "Condition Report"}
            </h3>
            <p className="text-sm text-white/50">
              {mode === "preview"
                ? serviceMeta
                  ? serviceMeta.subtitle
                  : "Your preview will appear here"
                : conditionReport
                  ? "AI-powered analysis of your boat's condition"
                  : "Your condition report will appear here"}
            </p>
          </div>

          <div className="surface-panel rounded-2xl overflow-hidden min-h-[450px] flex flex-col">
            {mode === "condition" ? (
              conditionLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                    <Scan className="w-10 h-10 text-primary/40" />
                  </div>
                  <p className="text-white/50 text-sm mb-6 max-w-[280px]">
                    Our AI is analyzing your boat&apos;s surfaces and generating a detailed condition report. This usually takes 5-10 seconds...
                  </p>
                  <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                  </div>
                </div>
              ) : conditionError ? (
                <div className="flex-1 p-6">
                  <ConditionReportError error={conditionError} onRetry={handleAnalyzeCondition} />
                </div>
              ) : conditionReport && image ? (
                <div className="flex-1 p-6">
                  <ConditionReportDisplay
                    report={conditionReport}
                    image={image}
                    onReset={handleReset}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                    <Scan className="w-10 h-10 text-white/15" />
                  </div>
                  <p className="text-white/50 text-sm mb-6 max-w-[240px]">
                    Upload a photo and click &quot;Analyze Condition&quot; to get a detailed assessment of your boat
                  </p>
                </div>
              )
            ) : result ? (
              <div className="flex-1 flex flex-col">
                {image && (
                  <div className="grid grid-cols-2 gap-px bg-white/10">
                    <div className="relative bg-neutral-900">
                      <Image
                        src={image}
                        alt="Original"
                        width={400}
                        height={300}
                        className="w-full h-auto object-contain"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/60 text-[10px] text-white/70">
                        Before
                      </div>
                    </div>
                    <div className="relative bg-neutral-900">
                      <Image
                        src={result}
                        alt="Preview"
                        width={400}
                        height={300}
                        className="w-full h-auto object-contain"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-primary/80 text-[10px] text-primary-foreground font-medium">
                        After
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex-1">
                    {serviceMeta && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-primary uppercase tracking-wider">
                          {selectedServiceData?.name}
                        </p>
                        <h4 className="text-lg font-semibold text-white mt-1">
                          {serviceMeta.title}
                        </h4>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 mb-5">
                      <p className="text-xs text-white/60 leading-relaxed">
                        <strong className="text-primary font-medium">Preview Disclaimer:</strong> AI preview
                        shown for visualization only. Final results depend on boat condition, materials,
                        lighting, and in-person assessment.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-auto">
                    <Button
                      asChild
                      className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    >
                      <Link href={`/quote?service=${selectedService}`}>
                        {serviceMeta?.ctaLabel || "Get My Quote"} <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-12 border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 font-medium"
                    >
                      <Link href={`/booking?service=${selectedService}`}>
                        Book This Service <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  <Sparkles className="w-10 h-10 text-white/15" />
                </div>
                <p className="text-white/50 text-sm mb-6 max-w-[240px]">
                  {loading
                    ? "Our AI is generating your preview. This usually takes 5-10 seconds..."
                    : "Upload a photo and select a service to see a preview"}
                </p>
                {loading && (
                  <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            Start over with a new photo
          </button>
        </div>
      </div>
    </div>
  );
}
