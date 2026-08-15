import { BACKEND_URL } from "@/lib/constants";
import { buttonVariants } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { Github } from "lucide-react";

export function GithubAuthCard() {
  return (
    <main className="bg-muted/20 flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm py-6 shadow-sm">
        <CardHeader className="text-center">
          <CardTitle>Log in to AI Playground</CardTitle>
          <CardDescription>
            Continue with GitHub to access your projects and coding sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href={`${BACKEND_URL}/api/v1/auth/github?client_id=vibeongo-next`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "flex w-full items-center justify-center gap-2",
            )}
          >
            <Github aria-hidden="true" />
            <span>Continue with GitHub</span>
          </a>
        </CardContent>
      </Card>
    </main>
  );
}
