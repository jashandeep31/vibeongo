"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import Link from "next/link";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { buttonVariants } from "@repo/ui/components/button";

interface ShellToolOutputDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  output: string[];
  isRunning: boolean;
}

const MOSHI_LINK_PATTERN = /(moshi:\/\/\S+)/;

export function ShellToolOutputDrawer({
  open,
  onOpenChange,
  title,
  output,
  isRunning,
}: ShellToolOutputDrawerProps) {
  const hasOutput = output.length > 0;
  const moshiLink = output
    .map((line) => line.match(MOSHI_LINK_PATTERN)?.[1])
    .find((link): link is string => Boolean(link));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] overflow-hidden">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            {moshiLink ? (
              <Link
                href={moshiLink}
                className={buttonVariants({ variant: "link" })}
              >
                Open Direct <ArrowUpRight />
              </Link>
            ) : null}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="bg-muted/40 min-h-0 flex-1 rounded-md border">
          {hasOutput ? (
            <pre className="text-foreground min-h-full overflow-x-auto p-3 font-mono text-xs leading-5 whitespace-pre">
              {output.join("\n")}
            </pre>
          ) : (
            <div className="text-muted-foreground flex h-full min-h-96 items-center justify-center gap-2 text-sm">
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for output...
                </>
              ) : (
                "No output yet."
              )}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
