type SectionCardProps = {
  title: string;
  description: string;
  points: string[];
};

export function SectionCard({ title, description, points }: SectionCardProps) {
  return (
    <article className="surface-panel bg-gradient-to-b from-card to-card/80 p-6">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {points.map((point) => (
          <li key={point}>- {point}</li>
        ))}
      </ul>
    </article>
  );
}
