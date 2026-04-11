"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function TransformationSlider() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(48);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const element = containerRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const nextPosition = ((clientX - rect.left) / rect.width) * 100;
    setPosition(clamp(nextPosition, 12, 88));
  }, []);

  const startDrag = useCallback((clientX: number) => {
    setIsDragging(true);
    updatePosition(clientX);
  }, [updatePosition]);

  const stopDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[5/4] overflow-hidden bg-neutral-950 md:aspect-[21/10]"
      onMouseMove={(event) => {
        if (isDragging) updatePosition(event.clientX);
      }}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchMove={(event) => {
        updatePosition(event.touches[0].clientX);
      }}
      onTouchEnd={stopDrag}
    >
      <Image
        src="/images/before-after/results-candidate-1.jpg"
        alt="Boat finish before correction and detailing"
        fill
        className="object-cover brightness-[0.58] contrast-[0.88] saturate-[0.68]"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/34 to-black/18" />

      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <Image
          src="/images/before-after/results-candidate-4.jpg"
          alt="Restored boat finish with deep gloss after premium detailing"
          fill
          className="object-cover brightness-[1.06] contrast-[1.14] saturate-[1.08]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/14 to-transparent" />
      </div>

      <div
        className="absolute inset-y-0 z-20 w-px -translate-x-1/2 bg-white/60 shadow-[0_0_30px_rgba(255,255,255,0.25)]"
        style={{ left: `${position}%` }}
      />

      <button
        type="button"
        aria-label="Drag to compare before and after results"
        aria-valuemin={12}
        aria-valuemax={88}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)} percent after reveal`}
        className="absolute top-1/2 z-30 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/78 text-[10px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_0_40px_rgba(0,0,0,0.45)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/60"
        style={{ left: `${position}%` }}
        onMouseDown={(event) => startDrag(event.clientX)}
        onTouchStart={(event) => startDrag(event.touches[0].clientX)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setPosition((current) => clamp(current - 4, 12, 88));
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            setPosition((current) => clamp(current + 4, 12, 88));
          }
        }}
      >
        Drag
      </button>

      <div className="absolute left-4 top-4 z-20 rounded-full border border-white/35 bg-white/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_0_30px_rgba(255,255,255,0.12)] md:left-8 md:top-8">
        After
      </div>
      <div className="absolute right-4 top-4 z-20 rounded-full border border-white/20 bg-black/72 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white md:right-8 md:top-8">
        Before
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 grid gap-6 p-5 md:grid-cols-2 md:gap-10 md:p-8">
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/62">Mirror Gloss</p>
          <p className="mt-2 text-sm leading-6 text-white/84 md:text-base">
            Sharper reflections, deeper color, and a finish that looks premium the moment it comes into view.
          </p>
        </div>
        <div className="max-w-sm md:justify-self-end md:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/52">Oxidized Finish</p>
          <p className="mt-2 text-sm leading-6 text-white/76 md:text-base">
            Flat reflection, reduced depth, and a finish that fades into the dock instead of standing out.
          </p>
        </div>
      </div>
    </div>
  );
}
