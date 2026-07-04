import { useState } from "react";
import AnimatedPrice from "@/components/quote/AnimatedPrice";
import { Button } from "@/components/ui/button";
import { ChevronUp, Download, Loader2, X } from "lucide-react";

interface LineItem {
  label: string;
  amount: number;
}

interface StickyPricePanelProps {
  lineItems: LineItem[];
  subtotal: number;
  requiresManualReview: boolean;
  reviewReasons: string[];
  breakdown: string[];
  canSubmit: boolean;
  isSubmitting: boolean;
  isDownloadingPDF: boolean;
  onSubmit: () => void;
  onDownloadPDF: () => void;
}

export default function StickyPricePanel({
  lineItems,
  subtotal,
  requiresManualReview,
  reviewReasons,
  breakdown,
  canSubmit,
  isSubmitting,
  isDownloadingPDF,
  onSubmit,
  onDownloadPDF,
}: StickyPricePanelProps) {
  const hasItems = lineItems.length > 0;
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <>
      <div className="hidden lg:block">
        <div className="sticky top-32">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b border-border">
              <p className="text-xs font-medium uppercase tracking-widest text-primary/70">Estimated Total</p>
              <AnimatedPrice value={subtotal} className="text-3xl font-bold text-foreground mt-1 block" />
            </div>

            {hasItems && (
              <div className="px-6 py-4 space-y-3 border-b border-border max-h-[240px] overflow-y-auto">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate pr-3">{item.label}</span>
                    <span className="text-sm font-medium text-foreground shrink-0">
                      ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {requiresManualReview && (
              <div className="px-6 py-3 bg-primary/5 border-b border-border">
                <p className="text-xs font-medium text-primary">Manual Review Required</p>
                <ul className="mt-1 space-y-0.5">
                  {reviewReasons.map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground">{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {hasItems && !requiresManualReview && subtotal > 0 && (
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Booking Request</span>
                  <span className="text-sm font-semibold text-foreground text-right">Due upon receipt</span>
                </div>
                <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">
                  Reserve your preferred date now and our team will follow up to confirm scheduling, scope, and final service details. Payment is due in full upon completion of service.
                </p>
              </div>
            )}

            {breakdown.length > 0 && (
              <details className="group">
                <summary className="px-6 py-3 text-xs font-medium text-primary/60 cursor-pointer hover:text-primary/80 transition-colors select-none flex items-center justify-between">
                  View Breakdown
                  <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="px-6 pb-4 space-y-1 max-h-48 overflow-y-auto">
                  {breakdown.map((line, i) => (
                    <p key={i} className={`text-xs ${line.startsWith("---") ? "font-semibold text-primary mt-2 first:mt-0" : "text-muted-foreground"}`}>{line}</p>
                  ))}
                </div>
              </details>
            )}

            <div className="px-6 py-5 space-y-2.5">
              <Button
                size="lg"
                className="w-full font-semibold h-12 rounded-xl"
                disabled={!canSubmit || isSubmitting}
                onClick={onSubmit}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
                ) : requiresManualReview ? (
                  "Book Now (Review Required)"
                ) : (
                  "Book Now"
                )}
              </Button>
              {!requiresManualReview && subtotal > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full font-medium h-10 rounded-xl border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm"
                  disabled={isDownloadingPDF || !canSubmit}
                  onClick={onDownloadPDF}
                >
                  {isDownloadingPDF ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</>
                  ) : (
                    <><Download className="w-4 h-4 mr-2" />Download Quote as PDF</>
                  )}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground/80">Serving Georgian Bay, Lake Simcoe, and Muskoka</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Trusted by boat owners across Ontario&apos;s premier boating regions.</p>
          </div>
        </div>
      </div>

      {subtotal > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          {mobileExpanded && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setMobileExpanded(false)} />
          )}
          <div className={`relative z-50 bg-card border-t border-border transition-all duration-300 ease-out ${mobileExpanded ? "rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.5)]" : ""}`}>
            {mobileExpanded && (
              <div className="max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-primary/70">Your Estimate</p>
                    <AnimatedPrice value={subtotal} className="text-2xl font-bold text-foreground mt-0.5 block" />
                  </div>
                  <button onClick={() => setMobileExpanded(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {hasItems && (
                  <div className="px-5 py-3 space-y-2.5 border-t border-border">
                    {lineItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground truncate pr-3">{item.label}</span>
                        <span className="text-sm font-medium text-foreground shrink-0">${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                )}

                {requiresManualReview && (
                  <div className="mx-5 my-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
                    <p className="text-xs font-medium text-primary">Manual Review Required</p>
                    <ul className="mt-1 space-y-0.5">
                      {reviewReasons.map((r, i) => (<li key={i} className="text-xs text-muted-foreground">{r}</li>))}
                    </ul>
                  </div>
                )}

                {!requiresManualReview && (
                  <div className="px-5 py-3 border-t border-border">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Booking Request</span>
                      <span className="text-sm font-semibold text-foreground text-right">Due upon receipt</span>
                    </div>
                    <p className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">Reserve your preferred date now and our team will follow up to confirm scheduling, scope, and final service details. Payment is due in full upon completion of service.</p>
                  </div>
                )}

                {breakdown.length > 0 && (
                  <details className="group border-t border-border">
                    <summary className="px-5 py-3 text-xs font-medium text-primary/60 cursor-pointer hover:text-primary/80 transition-colors select-none flex items-center justify-between">
                      View Full Breakdown
                      <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </summary>
                    <div className="px-5 pb-3 space-y-1 max-h-48 overflow-y-auto">
                      {breakdown.map((line, i) => (<p key={i} className={`text-xs ${line.startsWith("---") ? "font-semibold text-primary mt-2 first:mt-0" : "text-muted-foreground"}`}>{line}</p>))}
                    </div>
                  </details>
                )}

                <div className="px-5 pt-3 pb-5 space-y-2.5 border-t border-border">
                  <Button size="lg" className="w-full font-semibold h-12 rounded-xl" disabled={!canSubmit || isSubmitting} onClick={onSubmit}>
                    {isSubmitting ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>) : requiresManualReview ? "Book Now (Review Required)" : "Book Now"}
                  </Button>
                  {!requiresManualReview && (
                    <Button variant="outline" size="lg" className="w-full font-medium h-10 rounded-xl border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm" disabled={isDownloadingPDF || !canSubmit} onClick={onDownloadPDF}>
                      {isDownloadingPDF ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</>) : (<><Download className="w-4 h-4 mr-2" />Download Quote as PDF</>)}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!mobileExpanded && (
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer active:bg-muted" onClick={() => setMobileExpanded(true)}>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated Total</p>
                    <AnimatedPrice value={subtotal} className="text-lg font-bold text-foreground" />
                  </div>
                  {hasItems && (
                    <div className="flex items-center gap-1 text-primary/60">
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-medium">Details</span>
                    </div>
                  )}
                </div>
                <Button className="font-semibold rounded-xl px-5 h-10 text-sm" disabled={!canSubmit || isSubmitting} onClick={(e) => { e.stopPropagation(); onSubmit(); }}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Book Now"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
