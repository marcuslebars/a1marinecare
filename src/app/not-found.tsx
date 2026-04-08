import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section-space">
      <div className="page-shell max-w-2xl">
        <div className="surface-panel p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">404</p>
          <h1 className="mt-2 text-3xl font-semibold">Page not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The page you requested does not exist in the current route structure.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary underline-offset-2 hover:underline">
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
}
