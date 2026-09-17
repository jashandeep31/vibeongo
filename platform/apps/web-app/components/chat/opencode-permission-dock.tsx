"use client";

import type { PermissionRequest } from "@repo/api-client";
import { Button } from "@repo/ui/components/button";
import { ShieldAlert } from "lucide-react";

export function OpencodePermissionDock({
  request,
  isResponding,
  onDecide,
}: {
  request: PermissionRequest;
  isResponding: boolean;
  onDecide: (decision: "once" | "always" | "reject") => void;
}) {
  return (
    <section
      className="bg-card mb-2 overflow-hidden rounded-2xl border shadow-sm"
      aria-label="Permission required"
    >
      <div className="flex gap-3 p-4">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
        <div className="min-w-0 space-y-2">
          <div>
            <p className="font-medium">OpenCode needs permission</p>
            <p className="text-muted-foreground text-sm">
              {request.message || `Allow the ${request.action} action?`}
            </p>
          </div>
          {request.resources.length ? (
            <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
              {request.resources.map((resource) => (
                <code
                  key={resource}
                  className="bg-muted rounded-md px-2 py-1 text-xs break-all"
                >
                  {resource}
                </code>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="bg-muted/40 flex flex-wrap justify-end gap-2 border-t p-3">
        <Button
          type="button"
          variant="ghost"
          disabled={isResponding}
          onClick={() => onDecide("reject")}
        >
          Deny
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isResponding}
          onClick={() => onDecide("always")}
        >
          Always allow
        </Button>
        <Button
          type="button"
          disabled={isResponding}
          onClick={() => onDecide("once")}
        >
          Allow once
        </Button>
      </div>
    </section>
  );
}
