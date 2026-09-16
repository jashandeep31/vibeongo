"use client";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Box, Cloud } from "lucide-react";

export type ProjectSessionRuntime = "vm" | "sandbox";

type ProjectSessionRuntimeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (runtime: ProjectSessionRuntime) => void;
};

const runtimes = [
  {
    value: "vm" as const,
    title: "Virtual machine",
    description: "Launch the project on its configured cloud instance.",
    Icon: Cloud,
  },
  {
    value: "sandbox" as const,
    title: "Sandbox",
    description: "Launch the project in its configured isolated sandbox.",
    Icon: Box,
  },
];

export function ProjectSessionRuntimeDialog({
  open,
  onOpenChange,
  onSelect,
}: ProjectSessionRuntimeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a runtime</DialogTitle>
          <DialogDescription>
            Select where this session should run. The provider and size come
            from the project configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          {runtimes.map(({ value, title, description, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className="hover:border-primary hover:bg-muted/50 flex min-h-32 flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors"
            >
              <span className="bg-muted rounded-md p-2">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="text-muted-foreground mt-1 block text-sm">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
