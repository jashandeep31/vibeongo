"use client";
import { ProjectTemplateList } from "@/components/project-template-list";
export default function ClientView() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-10 md:py-14">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Project templates
        </h1>
      </header>
      <div className="mt-8">
        <ProjectTemplateList />
      </div>
    </div>
  );
}
