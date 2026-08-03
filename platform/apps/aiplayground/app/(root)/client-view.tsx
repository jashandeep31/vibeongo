"use client";

import { WorkComposer } from "@/components/work-composer";

const projects = [
  { id: "website-launch", name: "Website Launch" },
  { id: "mobile-app", name: "Mobile App" },
];

export default function ClientView() {
  return <WorkComposer projects={projects} />;
}
