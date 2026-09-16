"use client";

import { Button } from "@repo/ui/components/button";
import { useConfigStore } from "@/store/config-store";
import { useCreateProject } from "@/hooks/use-project";
import { projectConfigValidator } from "@repo/shared";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { buildProjectConfigPayload } from "./project-config-payload";
import {
  getProjectSubmissionError,
  validateProjectConfig,
} from "./project-config-validation";
import { scrollToProjectConfigErrors } from "./project-config-errors";

export default function ConfigPreviewAndCreate() {
  const router = useRouter();
  const configState = useConfigStore();
  const { mutateAsync, isPending } = useCreateProject();
  const setSubmissionErrors = useConfigStore(
    (state) => state.setSubmissionErrors,
  );
  const setHasAttemptedSubmit = useConfigStore(
    (state) => state.setHasAttemptedSubmit,
  );
  const resetSubmissionErrors = useConfigStore(
    (state) => state.resetSubmissionErrors,
  );

  return (
    <>
      <div>
        <Button
          type="button"
          disabled={isPending}
          onClick={async () => {
            const validationErrors = validateProjectConfig(
              useConfigStore.getState(),
            );
            setHasAttemptedSubmit(true);
            setSubmissionErrors(validationErrors);

            if (validationErrors.length) {
              toast.error("Please fix the project configuration errors");
              scrollToProjectConfigErrors();
              return;
            }

            const toastId = toast.loading("Creating project");
            try {
              const config = buildProjectConfigPayload(configState);
              projectConfigValidator.parse(config);
              await mutateAsync({
                ...config,
              });
              resetSubmissionErrors();
              toast.success("Project created", { id: toastId });
              router.push("/dashboard");
            } catch (error) {
              console.error(error);
              setSubmissionErrors([
                getProjectSubmissionError(error, "Failed to create project"),
              ]);
              toast.error("Project could not be created", { id: toastId });
              scrollToProjectConfigErrors();
            }
          }}
        >
          {isPending ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </>
  );
}
