"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Sparkles, ArrowRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ConditionReport } from "@/app/api/condition-report/route";
import { getServiceHref, services } from "@/content/site";

type LevelMeta = { label: string; color: string; bg: string };

const LEVEL_LABELS: Record<string, Record<string, LevelMeta>> = {
  oxidationLevel: {
    low: { label: "Low", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
    moderate: { label: "Moderate", color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30" },
    heavy: { label: "Heavy", color: "text-red-400", bg: "bg-red-500/20 border-red-500/30" },
  },
  glossLevel: {
    low: { label: "Low", color: "text-red-400", bg: "bg-red-500/20 border-red-500/30" },
    fair: { label: "Fair", color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30" },
    strong: { label: "Strong", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
  },
  cleanlinessLevel: {
    poor: { label: "Poor", color: "text-red-400", bg: "bg-red-500/20 border-red-500/30" },
    fair: { label: "Fair", color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30" },
    good: { label: "Good", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
  },
};

function calculateScore(report: ConditionReport): number {
  let score = 100;
  if (report.oxidationLevel === "moderate") score -= 20;
  if (report.oxidationLevel === "heavy") score -= 35;
  if (report.glossLevel === "fair") score -= 15;
  if (report.glossLevel === "low") score -= 30;
  if (report.cleanlinessLevel === "fair") score -= 10;
  if (report.cleanlinessLevel === "poor") score -= 25;
  score -= Math.min(report.likelyIssues.length * 5, 25);
  return Math.max(0, score);
}

function getScoreColor(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: "Excellent", color: "text-emerald-400", bg: "bg-emerald-500/20" };
  if (score >= 50) return { label: "Fair", color: "text-amber-400", bg: "bg-amber-500/20" };
  return { label: "Needs Attention", color: "text-red-400", bg: "bg-red-500/20" };
}

function getServiceName(slug: string): string {
  const service = services.find((s) => s.slug === slug);
  return service?.name || slug;
}

interface ConditionReportDisplayProps {
  report: ConditionReport;
  image: string;
  onReset?: () => void;
}

export function ConditionReportDisplay({
  report,
  image,
  onReset,
}: ConditionReportDisplayProps) {
  const score = calculateScore(report);
  const scoreMeta = getScoreColor(score);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Condition Report</h3>
            <p className="text-xs text-white/50">AI-powered boat assessment</p>
          </div>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="text-xs text-white/40 hover:text-white/60 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Analyze new photo
          </button>
        )}
      </div>

      <div className="surface-panel rounded-2xl overflow-hidden">
        {image && (
          <div className="relative aspect-[16/9] bg-neutral-900">
            <Image src={image} alt="Analyzed boat" fill className="object-contain" />
          </div>
        )}

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="currentColor" strokeWidth="8"
                  strokeDasharray={`${(score / 100) * 264} 264`}
                  strokeLinecap="round"
                  className={scoreMeta.color.replace("text-", "text-")}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{score}</span>
              </div>
            </div>
            <div>
              <p className={`text-sm font-semibold ${scoreMeta.color}`}>{scoreMeta.label}</p>
              <p className="text-xs text-white/50 mt-1">Overall Condition Score</p>
              <p className="text-xs text-white/40 mt-2 leading-relaxed">{report.confidenceNote}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Key Findings</p>
            <div className="grid grid-cols-3 gap-3">
              {(["oxidationLevel", "glossLevel", "cleanlinessLevel"] as const).map((key) => {
                const meta = LEVEL_LABELS[key][report[key]];
                return (
                  <div key={key} className={`p-3 rounded-xl border ${meta.bg} text-center`}>
                    <p className="text-xs text-white/60 capitalize">{key.replace("Level", "")}</p>
                    <p className={`text-sm font-semibold mt-1 ${meta.color}`}>{meta.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {report.likelyIssues.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Likely Issues Detected</p>
              <ul className="space-y-2">
                {report.likelyIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-white/80 leading-relaxed">{report.summary}</p>
          </div>

          {report.recommendedServices.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider">Recommended Services</p>
              <div className="flex flex-wrap gap-2">
                {report.recommendedServices.map((slug) => (
                  <Link
                    key={slug}
                    href={getServiceHref(slug)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    {getServiceName(slug)}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConditionReportErrorProps {
  error: string;
  onRetry?: () => void;
}

export function ConditionReportError({ error, onRetry }: ConditionReportErrorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-400 font-medium">Analysis Failed</p>
          <p className="text-sm text-white/60 mt-1">{error}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="w-full h-11 border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}
