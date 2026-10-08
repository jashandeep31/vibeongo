"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  usePanelRef,
} from "@repo/ui/components/resizable";

export function WorkspaceToolRail({ children }: { children: ReactNode }) {
  return (
    <nav
      aria-label="Session workspace"
      className="bg-background/35 absolute top-0 right-[env(safe-area-inset-right)] z-[60] flex max-h-full w-11 flex-col items-center gap-0 overflow-y-auto rounded-lg p-0 shadow-sm backdrop-blur-sm [&>button]:size-11 [&>button]:shrink-0 lg:static lg:max-h-none lg:w-12 lg:shrink-0 lg:gap-1 lg:overflow-visible lg:rounded-none lg:border-l lg:bg-background lg:px-0 lg:py-2 lg:shadow-none lg:backdrop-blur-none lg:[&>button]:size-8"
    >
      {children}
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
      <ResizablePanel id="chat" defaultSize="100%" minSize={isDesktop ? "300px" : "0px"}>
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
          className={`bg-background absolute inset-0 z-50 pr-[calc(3rem+env(safe-area-inset-right))] shadow-xl lg:relative lg:z-auto lg:h-full lg:pr-0 lg:shadow-none ${isOpen ? "" : "hidden"}`}
          aria-hidden={!isOpen}
        >
          {sidebar}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
