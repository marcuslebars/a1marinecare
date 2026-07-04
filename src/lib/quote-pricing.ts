// Marine Care now consumes the shared pricing engine. Every calculator, type,
// and the CARE config view live in @a1/pricing-engine — the single source of
// truth (which also holds pricing.config.json). This is a thin re-export so
// existing `@/lib/quote-pricing` import sites keep working unchanged.
export * from "@a1/pricing-engine";
