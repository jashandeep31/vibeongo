"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  usePanelRef,
} from "@repo/ui/components/resizable";

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
        {children}
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
