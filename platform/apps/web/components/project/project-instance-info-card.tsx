"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { instances } from "@repo/db";
import { Button, buttonVariants } from "@repo/ui/components/button";
import Link from "next/link";

type ProjectInstance = typeof instances.$inferSelect;

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
};

interface ProjectInstanceInfoCardProps {
  instance: ProjectInstance;
  isRestartingFinalScript?: boolean;
  onRestartFinalScript?: () => void;
}

export function ProjectInstanceInfoCard({
  instance,
  isRestartingFinalScript = false,
  onRestartFinalScript,
}: ProjectInstanceInfoCardProps) {
  const [copied, setCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const handleCopyPublicIp = async () => {
    const publicIp = instance.public_ip;

    if (!publicIp) {
      return;
    }

    try {
      await navigator.clipboard.writeText(String(publicIp));
      setCopied(true);

      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="flex flex-wrap items-center gap-x-8 gap-y-4 text-sm">
      <div>
        <p className="text-muted-foreground">Public IP</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="font-medium">{formatValue(instance.public_ip)}</p>
          <Button
            size="sm"
            type="button"
            variant="outline"
            aria-label="Copy IPv4 address"
            onClick={() => {
              void handleCopyPublicIp();
            }}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          <Link
            href={`http://${instance.public_ip}:8080`}
            target="_blank"
            className={buttonVariants({ variant: "link" })}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div>
        <p className="text-muted-foreground">Dev Script</p>
        <Button
          className="mt-1 gap-1.5"
          size="sm"
          type="button"
          variant="outline"
          disabled={!onRestartFinalScript || isRestartingFinalScript}
          aria-label="Restart dev script"
          title="Restart dev script"
          onClick={() => {
            onRestartFinalScript?.();
          }}
        >
          {isRestartingFinalScript ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Restart
        </Button>
      </div>
    </section>
  );
}
