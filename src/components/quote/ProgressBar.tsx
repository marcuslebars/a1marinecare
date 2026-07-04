import { Ship, Wrench, ClipboardCheck, CreditCard } from "lucide-react";

const STEPS = [
  { label: "Boat Details", icon: Ship },
  { label: "Services", icon: Wrench },
  { label: "Review", icon: ClipboardCheck },
  { label: "Secure Booking", icon: CreditCard },
];

interface ProgressBarProps {
  currentStep: number;
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="hidden sm:flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-px bg-border z-0" />
        <div
          className="absolute top-5 left-0 h-px bg-primary/50 z-0 transition-all duration-700 ease-out"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i <= currentStep;
          const isCurrent = i === currentStep;
          return (
            <div key={i} className="flex flex-col items-center gap-2 z-10 relative">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                  ${isCurrent
                    ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary)/0.3)]"
                    : isActive
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-card text-muted-foreground border border-border"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-xs font-medium transition-colors duration-300 ${
                  isCurrent ? "text-primary" : isActive ? "text-foreground/70" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="sm:hidden flex items-center gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              i <= currentStep ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className="sm:hidden text-xs text-muted-foreground mt-2 text-center">
        Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]?.label}
      </p>
    </div>
  );
}
