import { Check, ChevronRight } from "lucide-react";

export type ServiceKey =
  | "gelcoat"
  | "exterior"
  | "interior"
  | "ceramic"
  | "graphene"
  | "wetSanding"
  | "bottomPainting"
  | "vinyl";

interface ServiceCardProps {
  id: ServiceKey;
  title: string;
  description: string;
  selected: boolean;
  onToggle: () => void;
  onLearnMore: () => void;
  children?: React.ReactNode;
}

export default function ServiceCard({
  title,
  description,
  selected,
  onToggle,
  onLearnMore,
  children,
}: ServiceCardProps) {
  return (
    <div
      className={`
        rounded-2xl border transition-all duration-300 overflow-hidden
        ${selected
          ? "border-primary/40 bg-primary/3 shadow-[0_0_30px_rgba(var(--primary)/0.06)]"
          : "border-border bg-card hover:border-primary/20 hover:bg-primary/2"
        }
      `}
    >
      <div
        className="flex items-center gap-4 p-5 cursor-pointer select-none"
        onClick={onToggle}
      >
        <div
          className={`
            w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300
            ${selected
              ? "bg-primary text-primary-foreground"
              : "border border-muted-foreground/30 bg-muted text-transparent"
            }
          `}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold transition-colors duration-300 ${selected ? "text-foreground" : "text-foreground/80"}`}>
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLearnMore();
          }}
          className="shrink-0 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          Learn More
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {selected && children && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-border pt-5 space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
