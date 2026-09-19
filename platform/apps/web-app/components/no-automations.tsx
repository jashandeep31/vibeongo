import { Button } from "@repo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/components/empty";
import { CalendarClock, Plus } from "lucide-react";
import Link from "next/link";

export function NoAutomations() {
  return (
    <Empty className="min-h-64 border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CalendarClock />
        </EmptyMedia>
        <EmptyTitle>No automations yet</EmptyTitle>
        <EmptyDescription>
          Create an automation to run agent tasks on a schedule.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/automations/create">
            <Plus />
            Create automation
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
