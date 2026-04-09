import Link from "next/link";
import Image from "next/image";

type LinkItem = {
  href: string;
  title: string;
  description: string;
  imageSrc?: string;
};

type InternalLinkGridProps = {
  title: string;
  items: LinkItem[];
  emphasizeVisuals?: boolean;
};

export function InternalLinkGrid({ title, items, emphasizeVisuals = false }: InternalLinkGridProps) {
  return (
    <section className="section-space">
      <div className="page-shell">
        <h2 className="text-2xl font-semibold md:text-3xl">{title}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group surface-panel bg-gradient-to-b from-card to-card/80 p-5 transition-all duration-300 hover:border-primary/70 ${
                emphasizeVisuals ? "hover:-translate-y-1 hover:shadow-[0_26px_70px_-26px_rgba(0,0,0,1)]" : ""
              }`}
            >
              {item.imageSrc ? (
                <div className={`relative mb-4 overflow-hidden border border-border/70 ${emphasizeVisuals ? "aspect-[16/11] rounded-md" : "aspect-[16/10] rounded-xl"}`}>
                  <Image
                    src={item.imageSrc}
                    alt={item.title}
                    fill
                    className={`object-cover transition-transform duration-500 ${emphasizeVisuals ? "group-hover:scale-[1.04]" : ""}`}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                </div>
              ) : null}
              <p className="text-lg font-semibold text-foreground">{item.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
