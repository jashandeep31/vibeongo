"use client";

import { WorkComposer } from "@/components/work-composer";

export default function ClientView() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <WorkComposer projects={[]} />
    </div>
  );
}
