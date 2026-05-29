"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { instances } from "@repo/db";
import { Button, buttonVariants } from "@repo/ui/components/button";
import Link from "next/link";

type ProjectInstance = typeof instances.$inferSelect;

const formatDate = (value: unknown) => {
  if (!value) return "N/A";

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
};

const formatDuration = (
  startedAt: unknown,
  terminatedAt: unknown,
  now: Date,
) => {
  if (!startedAt) return "N/A";

  const startDate = new Date(String(startedAt));
  if (Number.isNaN(startDate.getTime())) return "N/A";

  const endDate = terminatedAt ? new Date(String(terminatedAt)) : now;
  if (Number.isNaN(endDate.getTime())) return "N/A";

  const durationMs = endDate.getTime() - startDate.getTime();
  if (durationMs < 0) return "N/A";

  const totalSeconds = Math.floor(durationMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

interface ProjectInstanceInfoCardProps {
  instance: ProjectInstance;
}

export function ProjectInstanceInfoCard({
  instance,
}: ProjectInstanceInfoCardProps) {
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const copyResetTimerRef = useRef<number | null>(null);
  const isTerminated =
    instance.state === "terminated" || !!instance.terminated_at;

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isTerminated) {
      return;
    }

    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [isTerminated]);

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
        <p className="text-muted-foreground">Spun Up For</p>
        <p className="font-medium">
          {formatDuration(instance.started_at, instance.terminated_at, now)}
        </p>
      </div>
    </section>
  );
}
