import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { History } from "lucide-react";

export function NoAutomationRuns() {
  return (
    <Empty className="min-h-52 border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <History />
        </EmptyMedia>
        <EmptyTitle>No runs yet</EmptyTitle>
        <EmptyDescription>
          Run this automation to create its first project session.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
