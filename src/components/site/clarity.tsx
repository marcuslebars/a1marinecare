"use client";

import { useEffect } from "react";

// Microsoft Clarity — click/scroll heatmaps + session recordings.
// Production only. Project id from NEXT_PUBLIC_CLARITY_ID (default: the
// A1 Marine Care project). Sessions are tagged with the ad that brought the
// visitor in, so recordings can be filtered by utm_content in Clarity.

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() || "yn66peioqe";
const UTM_STORAGE_KEY = "a1mc_utm";

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

function loadClarity(id: string) {
  if (window.clarity) return;
  const c = window as Window & { clarity?: ClarityFn };
  c.clarity = function (...args: unknown[]) {
    (c.clarity!.q = c.clarity!.q || []).push(args);
  } as ClarityFn;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

function tagSession() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Record<string, string> = {};
    for (const key of ["utm_source", "utm_campaign", "utm_content"]) {
      const value = params.get(key);
      if (value) fromUrl[key] = value.slice(0, 100);
    }
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    const utm = Object.keys(fromUrl).length ? fromUrl : stored ? (JSON.parse(stored) as Record<string, string>) : {};
    for (const [key, value] of Object.entries(utm)) {
      if (value) window.clarity?.("set", key, value);
    }
    if (utm.utm_source) window.clarity?.("set", "traffic", "paid");
  } catch {
    /* tagging is best-effort */
  }
}

export function Clarity() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !CLARITY_ID) return;
    loadClarity(CLARITY_ID);
    tagSession();
  }, []);

  return null;
}
