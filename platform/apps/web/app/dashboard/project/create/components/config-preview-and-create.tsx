"use client";

import { Button } from "@repo/ui/components/button";
import { useConfigStore } from "@/store/config-store";
import { useCreateProject } from "@/hooks/use-project";
import { projectConfigValidator } from "@repo/shared";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { buildProjectConfigPayload } from "./project-config-payload";

export default function ConfigPreviewAndCreate() {
  const router = useRouter();
  const configState = useConfigStore();
  const { mutateAsync } = useCreateProject();
  const config = buildProjectConfigPayload(configState);

  return (
    <>
      <div>
        <Button
          onClick={async () => {
            const toastId = toast.loading("Creating project");
            try {
              projectConfigValidator.parse(config);
              await mutateAsync({
                ...config,
              });
              //TODO: reset the form or even better redirect to the project dashboard
              toast.success("Project created", { id: toastId });
              router.push("/dashboard");
            } catch (error) {
              console.error(error);
              toast.error("Failed to create project", { id: toastId });
            }
          }}
        >
          Create Project
        </Button>
      </div>
    </>
  );
}
