"use client";

import { Activity, Component, type ReactNode } from "react";
import { Button } from "@repo/ui/components/button";

class PanelBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center"
      >
        <p className="text-sm">
          This tool could not load. Your conversation is still available.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={this.props.onClose}>
            Close tool
          </Button>
          <Button onClick={() => this.setState({ failed: false })}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
}

export function WorkspacePanel({
  isActive,
  onClose,
  children,
}: {
  isActive: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Activity mode={isActive ? "visible" : "hidden"}>
      <div className="h-full" aria-hidden={!isActive}>
        <PanelBoundary onClose={onClose}>{children}</PanelBoundary>
      </div>
    </Activity>
  );
}
