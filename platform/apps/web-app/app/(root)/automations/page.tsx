"use client";

import { NoAutomations } from "@/components/no-automations";
import {
  useGetProjectAutomations,
  useTriggerProjectAutomation,
} from "@repo/api-hooks";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { Skeleton } from "@repo/ui/components/skeleton";
import axios from "axios";
import { Bot, CalendarClock, Loader2, Play, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AutomationsPage() {
  const automationsQuery = useGetProjectAutomations();
  const triggerAutomation = useTriggerProjectAutomation();
  const automations = automationsQuery.data?.automations ?? [];

  const runAutomation = (id: string) => {
    triggerAutomation.mutate(id, {
      onSuccess: ({ message }) => toast.success(message),
      onError: (error) => {
        const responseMessage = axios.isAxiosError<{ message?: unknown }>(error)
          ? error.response?.data?.message
          : undefined;
        toast.error(
          typeof responseMessage === "string"
            ? responseMessage
            : "Could not trigger the automation.",
        );
      },
    });
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Automations
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Schedule agent tasks for your projects.
            </p>
          </div>
          <Button asChild>
            <Link href="/automations/create">
              <Plus />
              Create automation
            </Link>
          </Button>
        </header>

        {automationsQuery.isLoading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-52" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : automationsQuery.isError ? (
          <Empty className="mt-8 min-h-64 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bot />
              </EmptyMedia>
              <EmptyTitle>Automations could not be loaded</EmptyTitle>
              <EmptyDescription>
                Please refresh the page and try again.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : automations.length === 0 ? (
          <section className="mt-8">
            <NoAutomations />
          </section>
        ) : (
          <section className="mt-8 grid gap-4 md:grid-cols-2">
            {automations.map((automation) => (
              <Card key={automation.id}>
                <CardHeader className="gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="truncate">
                      <Link
                        href={`/automations/${automation.id}`}
                        className="hover:underline"
                      >
                        {automation.name}
                      </Link>
                    </CardTitle>
                    <Badge
                      variant={automation.enabled ? "secondary" : "outline"}
                    >
                      {automation.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {automation.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
                    <CalendarClock className="size-4 shrink-0" />
                    <span className="truncate font-mono">
                      {automation.cron_expression || "Manual only"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => runAutomation(automation.id)}
                    disabled={triggerAutomation.isPending}
                  >
                    {triggerAutomation.isPending &&
                    triggerAutomation.variables === automation.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Play />
                    )}
                    {triggerAutomation.isPending &&
                    triggerAutomation.variables === automation.id
                      ? "Starting…"
                      : "Run now"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
