interface TierOption {
  value: string;
  label: string;
  multiplier: string;
  description: string;
}

interface TierSelectorProps {
  tiers: TierOption[];
  selected: string;
  onSelect: (value: string) => void;
}

export default function TierSelector({ tiers, selected, onSelect }: TierSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tiers.map((tier) => {
        const isActive = selected === tier.value;
        return (
          <button
            key={tier.value}
            type="button"
            onClick={() => onSelect(tier.value)}
            className={`
              text-left p-4 rounded-xl border transition-all duration-300
              ${isActive
                ? "border-primary/50 bg-primary/6 shadow-[0_0_20px_rgba(var(--primary)/0.08)]"
                : "border-border bg-card hover:border-primary/20 hover:bg-primary/4"
              }
            `}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`font-semibold text-sm ${isActive ? "text-foreground" : "text-foreground/70"}`}>
                {tier.label}
              </span>
              <span
                className={`
                  text-xs font-mono px-2 py-0.5 rounded-full transition-all duration-300
                  ${isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {tier.multiplier}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{tier.description}</p>
          </button>
        );
      })}
    </div>
  );
}
