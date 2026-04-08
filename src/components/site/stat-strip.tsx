type Stat = {
  label: string;
  value: string;
};

type StatStripProps = {
  stats: Stat[];
};

export function StatStrip({ stats }: StatStripProps) {
  return (
    <section className="border-y border-border/70 bg-card">
      <div className="page-shell grid grid-cols-2 gap-4 py-8 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-semibold text-primary md:text-3xl">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
