"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const ROW_HEIGHT = 32;
const OVERSCAN = 6;

/** Fixed-height lists keep large runtime directories from blocking tool clicks. */
export function WindowedList({
  count,
  itemKey,
  children,
  isActive = true,
}: {
  count: number;
  itemKey: (index: number) => string;
  children: (index: number) => ReactNode;
  isActive?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ first: 0, height: 400 });
  useEffect(() => {
    const node = host.current;
    if (!node || !isActive) return;
    const measure = () =>
      setViewport((previous) => {
        const height = node.clientHeight || 400;
        const first = Math.floor(node.scrollTop / ROW_HEIGHT);
        return previous.height === height && previous.first === first
          ? previous
          : { first, height };
      });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    return () => observer.disconnect();
  }, [isActive, count]);
  const start = Math.max(
    0,
    Math.min(viewport.first - OVERSCAN, Math.max(0, count - 1)),
  );
  const end = Math.min(
    count,
    start + Math.ceil(viewport.height / ROW_HEIGHT) + OVERSCAN * 2,
  );

  if (!count) return null;

  return (
    <div
      ref={host}
      role="list"
      className="h-full min-h-0 overflow-y-auto"
      onScroll={(event) => {
        const first = Math.floor(event.currentTarget.scrollTop / ROW_HEIGHT);
        setViewport((previous) =>
          previous.first === first ? previous : { ...previous, first },
        );
      }}
      onKeyDown={(event) => {
        const row = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-windowed-index]",
        );
        if (!row || !count) return;
        const index = Number(row.dataset.windowedIndex);
        const offset =
          event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : index + offset;
        if (!offset && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const target = Math.max(0, Math.min(count - 1, next));
        const node = host.current;
        if (!node) return;
        if (target * ROW_HEIGHT < node.scrollTop)
          node.scrollTop = target * ROW_HEIGHT;
        else if ((target + 1) * ROW_HEIGHT > node.scrollTop + node.clientHeight)
          node.scrollTop = (target + 1) * ROW_HEIGHT - node.clientHeight;
        setViewport((previous) => ({
          ...previous,
          first: Math.floor(node.scrollTop / ROW_HEIGHT),
        }));
        requestAnimationFrame(() =>
          node
            .querySelector<HTMLButtonElement>(
              `[data-windowed-index="${target}"] button:not(:disabled)`,
            )
            ?.focus({ preventScroll: true }),
        );
      }}
    >
      <div className="relative" style={{ height: count * ROW_HEIGHT }}>
        {Array.from({ length: end - start }, (_, offset) => {
          const index = start + offset;
          return (
            <div
              key={itemKey(index)}
              role="listitem"
              aria-setsize={count}
              aria-posinset={index + 1}
              data-windowed-index={index}
              className="absolute inset-x-0"
              style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
              {children(index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
