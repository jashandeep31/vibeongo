import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, Check, Copy } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { instances } from "@repo/db";

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

interface ProjectInstanceCardProps {
  projectId: string;
  instance: ProjectInstance;
}

export function ProjectInstanceCard({
  projectId,
  instance,
}: ProjectInstanceCardProps) {
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">
            Instance {formatValue(instance.aws_instance_id)}
          </CardTitle>

          <div className="flex items-center gap-3">
            <Badge
              variant={instance.state === "running" ? "default" : "secondary"}
              className={
                instance.state === "running"
                  ? "border-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
                  : "text-muted-foreground border-0"
              }
            >
              {formatValue(instance.state)}
            </Badge>
          </div>
        </div>

        <CardDescription className="break-all">
          Instance Record ID: {instance.id}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 text-sm md:grid-cols-2">
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
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Started At</p>
            <p className="font-medium">{formatDate(instance.started_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Terminated At</p>
            <p className="font-medium">{formatDate(instance.terminated_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Created At</p>
            <p className="font-medium">{formatDate(instance.created_at)}</p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button asChild size="sm">
            <Link href={`/projects/${projectId}/instances/${instance.id}`}>
              Interact
              <ArrowDownRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
