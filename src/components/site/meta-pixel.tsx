"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { initMetaPixel, trackPixelPageView } from "@/lib/meta-pixel";

/**
 * Mounts the Meta Pixel and fires PageView on every App Router navigation.
 * Renders nothing. Lives in the root layout.
 */
export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    initMetaPixel();
    trackPixelPageView();
  }, [pathname]);

  return null;
}
