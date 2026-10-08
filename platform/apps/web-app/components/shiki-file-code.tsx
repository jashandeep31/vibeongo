"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

const HIGHLIGHT_IDLE_MS = 180;
const MAX_HIGHLIGHT_LENGTH = 500_000;
const MAX_HIGHLIGHT_LINES = 4000;

function canHighlight(code: string) {
  if (code.length > MAX_HIGHLIGHT_LENGTH) return false;
  let lines = 1;
  for (let index = 0; index < code.length; index++) {
    if (code.charCodeAt(index) === 10 && ++lines > MAX_HIGHLIGHT_LINES)
      return false;
  }
  return true;
}

type HighlightResponse = { id: number; html: string | null };

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  cjs: "javascript",
  cts: "typescript",
  h: "c",
  hpp: "cpp",
  htm: "html",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  mts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  tsx: "tsx",
  yml: "yaml",
  zsh: "bash",
};

function languageFromPath(path: string) {
  const name = path.split("/").at(-1) ?? "";
  const extension = name.includes(".") ? name.split(".").at(-1)?.toLowerCase() : "";
  if (!extension) {
    if (name === "Dockerfile") return "dockerfile";
    if (name === "Makefile") return "make";
    return "text";
  }
  return LANGUAGE_BY_EXTENSION[extension] ?? extension;
}

function useHighlightedCode(code: string, path: string) {
  const enabled = useMemo(() => canHighlight(code), [code]);
  const language = useMemo(() => languageFromPath(path), [path]);
  const [html, setHtml] = useState("");
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("./shiki-file-code.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      return;
    }

    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<HighlightResponse>) => {
      if (event.data.id === requestIdRef.current) {
        setHtml(event.data.html ?? "");
      }
    };
    worker.onerror = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      setHtml("");
    };

    return () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const id = ++requestIdRef.current;
    setHtml("");
    if (!enabled) return;
    const timer = setTimeout(() => {
      workerRef.current?.postMessage({ id, code, language });
    }, HIGHLIGHT_IDLE_MS);
    return () => clearTimeout(timer);
  }, [code, language, enabled]);

  return { html, language };
}

const highlightedPreClass =
  "[&_pre]:m-0 [&_pre]:min-h-full [&_pre]:min-w-full [&_pre]:w-max [&_pre]:!bg-transparent [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[11px] [&_pre]:leading-5 [&_pre]:[tab-size:2] [&_code]:font-inherit [&_.line]:min-h-5";

export const ShikiFileEditor = memo(function ShikiFileEditor({
  code,
  path,
  onChange,
}: {
  code: string;
  path: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(code);
  const codeLayerRef = useRef<HTMLDivElement>(null);
  const { html } = useHighlightedCode(draft, path);

  useEffect(() => {
    setDraft(code);
  }, [code]);

  return (
    <div className="relative h-full min-h-full min-w-full overflow-hidden bg-zinc-950 font-mono text-[11px] leading-5 [tab-size:2]">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden text-zinc-100 ${highlightedPreClass}`}
      >
        <div ref={codeLayerRef}>
          {html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <pre className="m-0 w-max min-w-full whitespace-pre p-3">
              <code>{draft}</code>
            </pre>
          )}
        </div>
      </div>
      <textarea
        aria-label={`Contents of ${path}`}
        className="absolute inset-0 size-full resize-none overflow-auto whitespace-pre rounded-none border-0 bg-transparent p-3 font-mono text-[11px] leading-5 text-transparent caret-zinc-100 selection:bg-sky-400/30 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 [tab-size:2]"
        spellCheck={false}
        wrap="off"
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          onChange(value);
        }}
        onScroll={(event) => {
          if (codeLayerRef.current) {
            codeLayerRef.current.style.transform = `translate(${-event.currentTarget.scrollLeft}px, ${-event.currentTarget.scrollTop}px)`;
          }
        }}
      />
    </div>
  );
});
