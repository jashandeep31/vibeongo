"use client";

import { ProjectAutomationForm } from "@/components/project-automation-form";
import {
  useGetProjectAutomation,
  useUpdateProjectAutomation,
} from "@repo/api-hooks";
import type { CreateProjectAutomationInput } from "@repo/api-client";
import { getProjectAutomationScheduleIdForCronExpression } from "@repo/shared";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Skeleton } from "@repo/ui/components/skeleton";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function EditAutomation({
  automationId,
}: {
  automationId: string;
}) {
  const router = useRouter();
  const automationQuery = useGetProjectAutomation(automationId);
  const mutation = useUpdateProjectAutomation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (automationQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8 sm:px-8 sm:py-12">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (automationQuery.isError || !automationQuery.data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Automation could not be loaded</AlertTitle>
          <AlertDescription>
            It may have been removed, or you may not have access to it.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { project_automation: automation, tasks } = automationQuery.data;
  const initialValues: CreateProjectAutomationInput = {
    name: automation.name,
    description: automation.description ?? undefined,
    project_id: automation.project_id,
    schedule_id: getProjectAutomationScheduleIdForCronExpression(
      automation.cron_expression,
    ),
    timezone: automation.timezone ?? "",
    tasks: tasks.map((task, index) => ({
      path_from_code: task.path_from_code,
      task_prompt: task.task_prompt,
      agent: task.agent,
      order_number: index + 1,
      model: task.model || undefined,
    })),
  };

  const handleSubmit = async (input: CreateProjectAutomationInput) => {
    setSubmitError(null);
    try {
      await mutation.mutateAsync({ id: automationId, input });
      toast.success("Automation updated");
      router.push(`/automations/${automationId}`);
    } catch (error) {
      const message = axios.isAxiosError<{ message?: unknown }>(error)
        ? error.response?.data?.message
        : undefined;
      setSubmitError(
        typeof message === "string"
          ? message
          : "Could not update the automation. Try again.",
      );
    }
  };

  return (
    <ProjectAutomationForm
      mode="edit"
      initialValues={initialValues}
      isPending={mutation.isPending}
      submitError={submitError}
      cancelHref={`/automations/${automationId}`}
      onSubmit={handleSubmit}
    />
  );
}
