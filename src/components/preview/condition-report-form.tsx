"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Upload, Scan, AlertCircle, Loader2, ImageIcon, RotateCcw, ArrowRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConditionReportDisplay, ConditionReportError } from "@/components/preview/condition-report";
import type { ConditionReport } from "@/app/api/condition-report/route";

const UPLOAD_TIPS = [
  "Use a clear, well-lit photo of your boat",
  "Show the areas you'd like us to focus on",
  "Side angles or stern views work best",
  "Avoid blurry or heavily filtered photos",
];

async function downloadConditionReport(report: ConditionReport, image: string): Promise<void> {
  const response = await fetch("/api/condition-report/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report, image }),
  });

  if (!response.ok) throw new Error("Failed to generate PDF");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `A1-Boat-Condition-Report-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ConditionReportForm() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [conditionReport, setConditionReport] = useState<ConditionReport | null>(null);
  const [conditionLoading, setConditionLoading] = useState(false);
  const [conditionError, setConditionError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setConditionError("Image too large. Please use an image under 10MB.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setConditionError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        setConditionError("Image too large. Please use an image under 10MB.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setConditionError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image || !imageFile) return;

    setConditionLoading(true);
    setConditionError(null);
    setConditionReport(null);

    try {
      const formData = new FormData();
      formData.append("image", image);

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

  const handleDownloadPDF = async () => {
    if (!conditionReport || !image) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadConditionReport(conditionReport, image);
    } catch {
      setDownloadError("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImageFile(null);
    setConditionReport(null);
    setConditionError(null);
    setDownloadError(null);
  };

  const showResult = conditionReport && image;

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Upload Your Boat Photo</h3>
            <p className="text-sm text-white/50 mb-4">
              JPG, PNG up to 10MB. A clear, well-lit photo gives the most accurate assessment.
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
                  onClick={handleReset}
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

          <Button
            onClick={handleAnalyze}
            disabled={!image || conditionLoading}
            className="w-full h-14 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {conditionLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Condition...
              </>
            ) : (
              <>
                <Scan className="w-5 h-5 mr-2" />
                Analyze Condition
              </>
            )}
          </Button>

          {conditionError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium">Analysis Failed</p>
                <p className="text-sm text-white/60 mt-1">{conditionError}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Condition Report</h3>
            <p className="text-sm text-white/50">
              {showResult
                ? "AI-powered analysis of your boat's condition"
                : "Your condition report will appear here"}
            </p>
          </div>

          <div className="surface-panel rounded-2xl overflow-hidden min-h-[450px] flex flex-col">
            {conditionLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  <Scan className="w-10 h-10 text-primary/40 animate-pulse" />
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
                <ConditionReportError error={conditionError} onRetry={handleAnalyze} />
              </div>
            ) : showResult ? (
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
            )}
          </div>

          {showResult && (
            <Button
              onClick={handleDownloadPDF}
              disabled={downloading}
              variant="outline"
              className="w-full h-11 border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 font-medium"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download My Condition Report
            </Button>
          )}

          {downloadError && (
            <p className="text-xs text-center text-red-400">{downloadError}</p>
          )}

          {showResult && (
            <div className="flex gap-3">
              <Button asChild className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                <Link href="/quote">
                  Get My Quote <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 h-12 border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10 font-medium">
                <Link href="/preview">
                  Visual Preview <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full text-center text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            Start over with a new photo
          </button>
        </div>
      </div>

      {showResult && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
          <p className="text-xs text-white/50">
            <strong className="text-white/70">Disclaimer:</strong> AI-generated report for visualization and guidance only. Final recommendations depend on boat condition and in-person assessment.
          </p>
        </div>
      )}
    </div>
  );
}
