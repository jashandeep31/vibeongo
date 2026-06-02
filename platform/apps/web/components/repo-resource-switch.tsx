import Link from "next/link";
import { GitPullRequest, MessageSquare } from "lucide-react";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

type RepoResourceSwitchProps = {
  id: string;
  active: "issues" | "pull-requests";
};

export function RepoResourceSwitch({ id, active }: RepoResourceSwitchProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/dashboard/repos/${id}/issues`}
        className={cn(
          buttonVariants({
            variant: active === "issues" ? "default" : "outline",
            size: "sm",
          }),
        )}
      >
        <MessageSquare className="h-4 w-4" />
        Issues
      </Link>
      <Link
        href={`/dashboard/repos/${id}/pull-requests`}
        className={cn(
          buttonVariants({
            variant: active === "pull-requests" ? "default" : "outline",
            size: "sm",
          }),
        )}
      >
        <GitPullRequest className="h-4 w-4" />
        Pull requests
      </Link>
    </div>
  );
}
