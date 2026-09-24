import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Check, Phone, ShieldCheck } from "lucide-react";

import { DepositConversion } from "@/components/shrink-wrap/deposit-conversion";
import { Button } from "@/components/ui/button";
import { company } from "@/content/site";
import { formatCents } from "@/lib/shrink-wrap-pricing";
import { isStripeConfigured, retrieveCheckoutSession, type CheckoutSession } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Deposit received — your spot is held | A1 Marine Care",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function DepositSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;

  let session: CheckoutSession | null = null;
  if (sessionId && isStripeConfigured()) {
    session = await retrieveCheckoutSession(sessionId).catch((err) => {
      console.error("[Deposit success] session lookup failed:", err instanceof Error ? err.message : String(err));
      return null;
    });
  }

  const paid = session?.payment_status === "paid";
  const amountCents = session?.amount_total ?? 0;
  const firstName = (session?.metadata?.customerName || session?.customer_details?.name || "").split(" ")[0];
  const quoteId = session?.metadata?.quoteId || session?.client_reference_id || "";
  const boat = session?.metadata?.boat || "";
  const phoneHref = `tel:${company.phone.replace(/\D/g, "")}`;

  if (!paid) {
    return (
      <section className="bg-black py-20 text-white md:py-28">
        <div className="page-shell max-w-2xl">
          <div className="rounded-[2rem] border border-white/10 bg-[#0d1117] p-8 md:p-10">
            <h1 className="text-3xl font-black md:text-4xl">We didn&apos;t see a completed payment.</h1>
            <p className="mt-4 text-base leading-7 text-white/70">
              If your card was charged you&apos;ll have a receipt from Stripe in your inbox and you&apos;re all set — we&apos;ll be in touch.
              If not, nothing was taken and you can try again or just call us and we&apos;ll hold your spot by phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/shrink-wrapping#quote">
                  Back to my quote <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="heroOutline" size="lg" className="gap-2 border-white/30 text-white hover:bg-white/10">
                <a href={phoneHref}>
                  <Phone className="h-4 w-4" /> Call {company.phone}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-black py-20 text-white md:py-28">
      <DepositConversion sessionId={session!.id} amountCents={amountCents} />
      <div className="page-shell max-w-2xl">
        <div className="rounded-[2rem] border border-primary/40 bg-[#0d1117] p-8 shadow-2xl shadow-black/60 md:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Check className="h-3.5 w-3.5" /> Spot held
          </div>
          <h1 className="mt-4 text-3xl font-black md:text-5xl">
            {firstName ? `${firstName}, you're in.` : "You're in."}
          </h1>
          <p className="mt-4 text-base leading-7 text-white/75">
            Your {formatCents(amountCents)} deposit is received{boat ? ` for the ${boat}` : ""}. It comes straight off your final invoice.
            We&apos;ll call you within one business hour to lock the date — or grab one yourself right now.
          </p>

          <ul className="mt-6 space-y-3 text-sm text-white/80">
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Receipt from Stripe is on its way to your inbox.</span>
            </li>
            <li className="flex gap-3">
              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>We come to the boat — driveway, trailer, or storage lot. Nothing to tow across town.</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Questions before then? {company.phone} — a person answers.</span>
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            {quoteId ? (
              <Button asChild size="lg" className="gap-2">
                <Link href={`/booking?quoteId=${encodeURIComponent(quoteId)}`}>
                  Pick my wrap date <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="heroOutline" size="lg" className="gap-2 border-white/30 text-white hover:bg-white/10">
              <a href={phoneHref}>
                <Phone className="h-4 w-4" /> Call {company.phone}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
