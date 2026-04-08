import Link from "next/link";

type LinkItem = {
  href: string;
  title: string;
  description: string;
};

type InternalLinkGridProps = {
  title: string;
  items: LinkItem[];
};

export function InternalLinkGrid({ title, items }: InternalLinkGridProps) {
  return (
    <section className="section-space">
      <div className="page-shell">
        <h2 className="text-2xl font-semibold md:text-3xl">{title}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="surface-panel bg-gradient-to-b from-card to-card/80 p-5 transition-colors hover:border-primary/60"
            >
              <p className="text-lg font-semibold">{item.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
