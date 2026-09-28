"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Sets `data-inview` on the wrapper the first time it scrolls into view.
 * Descendants animate from CSS via `[data-inview] .lp-*` selectors.
 */
export function InView({
  children,
  className,
  id,
  threshold = 0.2,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.inview = "";
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} id={id} className={`lp-scope ${className ?? ""}`}>
      {children}
    </div>
  );
}
