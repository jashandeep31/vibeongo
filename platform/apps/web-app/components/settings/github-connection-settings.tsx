"use client";

import { useEffect } from "react";
import { useGithubConnection, useStartGithubConnection } from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import { Github, LoaderCircle } from "lucide-react";
import { isAxiosError } from "axios";
import { toast } from "sonner";

export function GithubConnectionSettings() {
  const connection = useGithubConnection();
  const start = useStartGithubConnection();
  useEffect(() => {
    const url = new URL(window.location.href);
    const outcome = url.searchParams.get("github");
    if (!outcome) return;
    if (outcome === "connected")
      toast.success("GitHub connected. Use GitHub to sign in from now on.");
    else
      toast.error(
        url.searchParams.get("message") ||
          "Could not connect GitHub. Please try again.",
      );
    url.searchParams.delete("github");
    url.searchParams.delete("message");
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);
  const connect = async () => {
    try {
      const { url } = await start.mutateAsync({ clientType: "web" });
      window.location.assign(url);
    } catch (error) {
      toast.error(
        isAxiosError(error) && typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "Could not start GitHub connection. Please try again.",
      );
    }
  };
  return (
    <section className="py-3 md:py-4">
      <div className="flex items-start gap-4">
        <Github
          className="text-muted-foreground mt-1 size-4 shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <h2 className="font-semibold">GitHub account</h2>
          {connection.isPending ? (
            <p className="text-muted-foreground text-sm">
              Checking connection…
            </p>
          ) : connection.isError ? (
            <>
              <p role="alert" className="text-destructive text-sm">
                Could not check your GitHub connection.
              </p>
              <Button
                variant="outline"
                onClick={() => void connection.refetch()}
              >
                Retry
              </Button>
            </>
          ) : connection.data?.connected ? (
            <p className="text-muted-foreground text-sm">
              Connected
              {connection.data.username
                ? ` as @${connection.data.username}`
                : ""}
              . GitHub is your primary login.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground max-w-xl text-sm">
                Connect GitHub to access your repositories. Your profile will
                use your GitHub details, and GitHub will replace email/password
                login.
              </p>
              <Button onClick={() => void connect()} disabled={start.isPending}>
                {start.isPending ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <Github aria-hidden="true" />
                )}{" "}
                {start.isPending ? "Connecting…" : "Connect GitHub"}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
