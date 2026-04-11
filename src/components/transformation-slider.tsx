"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function TransformationSlider() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(52);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const element = containerRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const nextPosition = ((clientX - rect.left) / rect.width) * 100;
    setPosition(clamp(nextPosition, 8, 92));
  }, []);

  const startDrag = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      updatePosition(clientX);
    },
    [updatePosition],
  );

  const stopDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="group relative aspect-[5/4] overflow-hidden rounded-[2rem] bg-neutral-950 md:aspect-[21/10]"
      onMouseMove={(event) => {
        if (isDragging) updatePosition(event.clientX);
      }}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchMove={(event) => {
        if (!isDragging) return;
        updatePosition(event.touches[0].clientX);
      }}
      onTouchEnd={stopDrag}
    >
      <div className="absolute inset-0">
        <Image
          src="/images/before-after/chaparral-before.webp"
          alt="Chaparral boat hull before detailing with a dull, oxidized finish"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      <div
        className="absolute inset-0 will-change-[clip-path]"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src="/images/before-after/chaparral-after.webp"
          alt="Chaparral boat hull after detailing with a restored, high-gloss finish"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/16" />
      <div className="pointer-events-none absolute inset-y-0 z-20 w-px -translate-x-1/2 bg-white/80 shadow-[0_0_30px_rgba(255,255,255,0.35)]" style={{ left: `${position}%` }} />
      <div className="pointer-events-none absolute inset-y-0 z-10 w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent blur-xl" style={{ left: `${position}%` }} />

      <button
        type="button"
        aria-label="Drag to compare before and after results"
        aria-valuemin={8}
        aria-valuemax={92}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)} percent after reveal`}
        className="absolute top-1/2 z-30 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/72 text-[10px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_0_40px_rgba(0,0,0,0.45)] transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/60 group-active:scale-105"
        style={{ left: `${position}%` }}
        onMouseDown={(event) => startDrag(event.clientX)}
        onTouchStart={(event) => startDrag(event.touches[0].clientX)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setPosition((current) => clamp(current - 4, 8, 92));
          }

          if (event.key === "ArrowRight") {
            event.preventDefault();
            setPosition((current) => clamp(current + 4, 8, 92));
          }
        }}
      >
        Slide
      </button>

      <div className="absolute left-4 top-4 z-20 rounded-full border border-white/20 bg-black/66 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white md:left-8 md:top-8">
        Before
      </div>
      <div className="absolute right-4 top-4 z-20 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_0_30px_rgba(255,255,255,0.12)] md:right-8 md:top-8">
        After
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 grid gap-6 p-5 md:grid-cols-2 md:gap-10 md:p-8">
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Before Correction</p>
          <p className="mt-2 text-sm leading-6 text-white/80 md:text-base">
            Oxidation softens the color and reflection, making the hull look tired and flat.
          </p>
        </div>
        <div className="max-w-sm md:justify-self-end md:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/68">After Restoration</p>
          <p className="mt-2 text-sm leading-6 text-white/88 md:text-base">
            Correction and polishing restore depth, gloss, and a cleaner mirror-like finish.
          </p>
        </div>
      </div>
    </div>
  );
}
