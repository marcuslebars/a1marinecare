interface OptionToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function OptionToggle({ id, label, checked, onChange }: OptionToggleProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={() => onChange(!checked)}
      className={`
        flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left text-sm transition-all duration-200
        ${checked
          ? "border-primary/30 bg-primary/6 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:bg-primary/4"
        }
      `}
    >
      <div
        className={`
          w-4 h-4 rounded shrink-0 flex items-center justify-center transition-all duration-200
          ${checked ? "bg-primary text-primary-foreground border-0" : "border border-muted-foreground/30"}
        `}
      >
        {checked && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span>{label}</span>
    </button>
  );
}
