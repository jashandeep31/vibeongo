"use client";

import ConfigPreviewAndCreate from "./components/config-preview-and-create";
import ProjectConfigForm from "./components/project-config-form";

export default function ClientView() {
  return (
    <ProjectConfigForm
      title="Create project"
      description="Set up a new deployment environment for your application."
      submitAction={<ConfigPreviewAndCreate />}
    />
  );
}
