"use client";

import { memo, useEffect, useRef, useState, type RefObject } from "react";

/** Only this tiny view updates for microphone levels; audio stays in refs. */
export const VoiceWaveform = memo(function VoiceWaveform({
  meterRef,
}: {
  meterRef: RefObject<number>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [levels, setLevels] = useState<number[]>([]);
  const widthRef = useRef(0);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      widthRef.current = Math.floor((entry?.contentRect.width ?? 0) / 5);
    });
    observer.observe(container);
    const interval = setInterval(() => {
      const level = Math.min(1, Math.max(0, (meterRef.current + 50) / 50));
      setLevels((previous) =>
        [...previous, level].slice(-Math.max(1, widthRef.current)),
      );
    }, 120);
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [meterRef]);
  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="flex h-8 min-w-0 flex-1 items-center justify-end gap-[3px] overflow-hidden text-red-600 dark:text-red-400"
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className="w-0.5 shrink-0 rounded-full bg-current"
          style={{ height: 3 + level * 25 }}
        />
      ))}
    </div>
  );
});
