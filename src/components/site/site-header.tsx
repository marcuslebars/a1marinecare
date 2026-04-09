"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { mainNavigation } from "@/content/navigation";
import { company } from "@/content/site";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="page-shell flex h-16 items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.12em] text-primary">
          <Image src="/images/logos/logo.png" alt="A1 Marine Care logo" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="hidden sm:inline">{company.name}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {mainNavigation.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Button size="sm" asChild>
            <Link href="/quote">Get Quote</Link>
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="page-shell flex flex-col gap-4 py-4">
            {mainNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Button size="sm" asChild className="w-full">
              <Link href="/quote" onClick={() => setOpen(false)}>
                Get Quote
              </Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
