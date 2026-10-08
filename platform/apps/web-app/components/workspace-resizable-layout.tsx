"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  usePanelRef,
} from "@repo/ui/components/resizable";

export function WorkspaceToolRail({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const controlsId = useId();
  const controlsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const collapse = useCallback(() => {
    if (controlsRef.current?.contains(document.activeElement)) {
      toggleRef.current?.focus({ preventScroll: true });
    }
    clearTimer();
    setExpanded(false);
  }, [clearTimer]);

  const restartTimer = useCallback(() => {
    clearTimer();
    if (!isDesktop) timerRef.current = setTimeout(collapse, 4_000);
  }, [clearTimer, collapse, isDesktop]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      setIsDesktop(media.matches);
      clearTimer();
      setExpanded(false);
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      clearTimer();
    };
  }, [clearTimer]);

  const keepOpen = () => {
    if (expanded && !isDesktop) restartTimer();
  };

  return (
    <nav
      aria-label="Session workspace"
      className="bg-background absolute top-2 right-[calc(0.5rem+env(safe-area-inset-right))] z-[60] flex max-h-[calc(100%-1rem)] w-11 flex-col items-center overflow-hidden rounded-lg p-0 shadow-sm lg:static lg:max-h-none lg:w-12 lg:shrink-0 lg:overflow-visible lg:rounded-none lg:border-l lg:py-2 lg:shadow-none"
      onPointerDownCapture={keepOpen}
      onPointerMoveCapture={keepOpen}
      onFocusCapture={keepOpen}
      onKeyDownCapture={(event) => {
        if (!isDesktop && expanded) {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            collapse();
          } else restartTimer();
        }
      }}
    >
      <div
        id={controlsId}
        className={`grid min-h-0 w-full transition-[grid-template-rows] duration-150 ease-out motion-reduce:transition-none lg:grid-rows-[1fr] ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        aria-hidden={!isDesktop && !expanded}
        inert={!isDesktop && !expanded}
      >
        <div
          ref={controlsRef}
          className="flex min-h-0 flex-col items-center gap-0 overflow-y-auto lg:gap-1 lg:overflow-visible [&>button]:size-11 [&>button]:shrink-0 lg:[&>button]:size-8"
        >
          {children}
        </div>
      </div>
      <Button
        ref={toggleRef}
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 lg:hidden"
        aria-label={
          expanded ? "Collapse workspace tools" : "Expand workspace tools"
        }
        aria-expanded={expanded}
        aria-controls={controlsId}
        onClick={() => {
          if (expanded) collapse();
          else {
            setExpanded(true);
            restartTimer();
          }
        }}
      >
        <ChevronDown
          className={`transition-transform duration-150 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
        />
      </Button>
    </nav>
  );
}

export function WorkspaceResizableLayout({
  children,
  sidebar,
  isOpen,
}: {
  children: ReactNode;
  sidebar: ReactNode;
  isOpen: boolean;
}) {
  const [isDesktop, setIsDesktop] = useState(false);
  const sidebarRef = usePanelRef();
  const lastSidebarSizeRef = useRef(52);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    sidebarRef.current?.resize(
      isDesktop && isOpen ? `${lastSidebarSizeRef.current}%` : "0%",
    );
  }, [isDesktop, isOpen, sidebarRef]);

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="relative min-h-0 min-w-0 flex-1"
      style={{ overflow: "visible" }}
      disabled={!isDesktop || !isOpen}
      onLayoutChanged={(layout, { isUserInteraction }) => {
        if (isUserInteraction && layout.workspace && layout.workspace > 0) {
          lastSidebarSizeRef.current = layout.workspace;
        }
      }}
    >
      <ResizablePanel
        id="chat"
        defaultSize="100%"
        minSize={isDesktop ? "300px" : "0px"}
      >
        <div
          className="h-full min-h-0 min-w-0"
          inert={isOpen && !isDesktop}
          aria-hidden={isOpen && !isDesktop}
        >
          {children}
        </div>
      </ResizablePanel>
      <ResizableHandle
        aria-label="Resize chat and workspace sidebar"
        className={isDesktop && isOpen ? "hover:bg-ring" : "hidden"}
      />
      <ResizablePanel
        id="workspace"
        panelRef={sidebarRef}
        defaultSize="0%"
        minSize={isDesktop && isOpen ? "280px" : "0px"}
        maxSize="70%"
        style={{ overflow: "visible" }}
      >
        <div
          className={`bg-background absolute inset-0 z-50 shadow-xl lg:relative lg:z-auto lg:h-full lg:shadow-none ${isOpen ? "" : "hidden"}`}
          aria-hidden={!isOpen}
        >
          {sidebar}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
