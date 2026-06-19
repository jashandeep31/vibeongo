import Link from "next/link";
import type { Metadata } from "next";
import { AtSign, CheckCircle2, Clock3, Mail } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";

export const metadata: Metadata = {
  title: "Invite Only | VibeOnGo",
  description:
    "VibeOnGo is currently invite only. Reach out on X for faster account verification.",
};

export default function Page() {
  return (
    <main className="bg-background relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
      <div className="via-primary/70 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between">
          <div className="text-foreground text-lg font-bold tracking-tight">
            VibeOnGo
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            Private preview
          </Badge>
        </header>

        <section className="flex flex-1 items-center py-16">
          <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="border-primary/20 bg-primary/10 text-primary mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium">
                <span className="bg-primary h-2 w-2 animate-pulse rounded-full" />
                Invite-only access
              </div>

              <h1 className="text-foreground max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                We are opening VibeOnGo carefully.
              </h1>

              <p className="text-muted-foreground mt-6 max-w-2xl text-base leading-7 sm:text-lg">
                Your account is on the invite list. Please wait while we review
                and allow access. For faster verification, reach out on X with
                the account details you used to sign up.
              </p>

              <div className="border-primary/25 bg-primary/10 mt-8 max-w-xl rounded-lg border p-5">
                <div className="flex gap-3">
                  <div className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <AtSign className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      Fastest verification
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      Reach out on X at{" "}
                      <Link
                        href="https://x.com/Jashandeep31"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground font-medium underline underline-offset-4"
                      >
                        @Jashandeep31
                      </Link>{" "}
                      and include your signup email or GitHub username.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground mt-4 flex max-w-xl gap-2 text-sm">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Email is also available at{" "}
                  <Link
                    href="mailto:jashan.signup@gmail.com"
                    className="text-foreground font-medium underline underline-offset-4"
                  >
                    jashan.signup@gmail.com
                  </Link>
                  .
                </span>
              </p>
            </div>

            <div className="bg-card/80 border-border rounded-lg border p-5 shadow-sm backdrop-blur sm:p-6">
              <div className="border-border flex items-start gap-4 border-b pb-5">
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-foreground text-base font-semibold">
                    Access pending
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    We are approving users in small batches to keep the preview
                    fast and reliable.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Reach out on X</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Send your request to{" "}
                      <Link
                        href="https://x.com/Jashandeep31"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground font-medium underline underline-offset-4"
                      >
                        @Jashandeep31
                      </Link>{" "}
                      for the fastest review.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      Include your signup email
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      It helps us match the request with your pending account.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Email as fallback</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      For mail verification, contact{" "}
                      <Link
                        href="mailto:jashan.signup@gmail.com"
                        className="text-foreground font-medium underline underline-offset-4"
                      >
                        jashan.signup@gmail.com
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
