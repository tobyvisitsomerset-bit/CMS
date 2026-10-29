"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusStyle } from "@/lib/page-display";

export type HeroSlide = { imageUrl?: string; link?: string; label?: string; logoUrl?: string; focus?: string };

// Rotating background photos for the home hero. Each photo can carry the
// member it features, shown bottom right with their logo and a link to their
// website. Rotation stops while someone is pointing at or tabbing through the
// controls, and never starts for people who prefer reduced motion.
export function HeroSlides({
  slides,
  bottomClass = "bottom-4",
  intervalMs = 6000,
}: {
  slides: HeroSlide[];
  bottomClass?: string;
  intervalMs?: number;
}) {
  const shown = slides.filter((s) => s.imageUrl);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = shown.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(t);
  }, [count, paused, intervalMs]);

  if (count === 0) return null;
  const current = shown[Math.min(index, count - 1)];
  const external = current.link ? /^https?:\/\//i.test(current.link) : false;
  const hasChip = !!(current.label || current.logoUrl);

  return (
    <>
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {shown.map((s, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${s.imageUrl}-${i}`}
            src={s.imageUrl}
            alt=""
            style={focusStyle(s.focus)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>
      <div className={cn("pointer-events-none absolute inset-x-0 z-10", bottomClass)}>
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-6">
          {count > 1 ? (
            <div
              className="pointer-events-auto flex items-center gap-2"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            >
              {shown.map((s, i) => (
                <button
                  key={`${s.imageUrl}-dot-${i}`}
                  type="button"
                  aria-label={`Show photo ${i + 1} of ${count}${s.label ? `: ${s.label}` : ""}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className={cn("h-2.5 rounded-full transition-all", i === index ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80")}
                />
              ))}
            </div>
          ) : (
            <span />
          )}
          {hasChip &&
            (() => {
              const inner = (
                <>
                  {current.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.logoUrl} alt="" className="max-h-10 w-auto max-w-[120px] object-contain" />
                  )}
                  {current.label && <span className="text-sm font-semibold text-stone-900">{current.label}</span>}
                  {current.link && <ArrowUpRight className="size-4 shrink-0 text-stone-600" aria-hidden="true" />}
                </>
              );
              const cls = "pointer-events-auto flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-2.5 shadow-lg backdrop-blur";
              return current.link ? (
                <a
                  href={current.link}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={cn(cls, "hover:bg-white")}
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                >
                  {inner}
                  {current.label && <span className="sr-only">{external ? "(opens in a new tab)" : ""}</span>}
                </a>
              ) : (
                <div className={cls}>{inner}</div>
              );
            })()}
        </div>
      </div>
    </>
  );
}
