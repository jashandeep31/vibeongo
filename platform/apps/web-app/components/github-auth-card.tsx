import { BACKEND_URL } from "@/lib/constants";
import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const GITHUB_AUTH_URL = `${BACKEND_URL}/api/v1/auth/github?client_id=vibeongo-next`;

const COPY = {
  login: {
    title: "Welcome back",
    description: "Sign in to continue to AI Playground",
    prompt: "New here?",
    linkLabel: "Create an account",
    linkHref: "/signup",
  },
  signup: {
    title: "Create your account",
    description: "Get started with AI Playground using GitHub",
    prompt: "Already have an account?",
    linkLabel: "Log in",
    linkHref: "/login",
  },
} as const;

export function GithubAuthCard({
  mode = "login",
}: {
  mode?: keyof typeof COPY;
}) {
  const copy = COPY[mode];

  return (
    <main className="bg-background flex min-h-svh items-center justify-center px-6">
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <Image
          src="/vibeongologo.png"
          alt="VibeOnGo"
          width={40}
          height={40}
          className="mb-8 size-10 rounded-lg"
        />
        <h1 className="text-xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          {copy.description}
        </p>
        <a
          href={GITHUB_AUTH_URL}
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-8 flex w-full items-center justify-center gap-2",
          )}
        >
          <Github aria-hidden="true" />
          <span>Continue with GitHub</span>
        </a>
        <p className="text-muted-foreground mt-6 text-xs">
          {copy.prompt}{" "}
          <Link
            href={copy.linkHref}
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {copy.linkLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
