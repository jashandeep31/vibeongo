import Link from "next/link";
import Image from "next/image";
import { Button } from "@repo/ui/components/button";
import { isAuthenticated } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { LandingFeatures } from "@/components/landing-features";
import { LandingFaq } from "@/components/landing-faq";
import { LandingHowItWorks } from "@/components/landing-how-it-works";
import { LandingToolsStrip } from "@/components/landing-tools-strip";

export default async function Page() {
  const authenticated = await isAuthenticated();
  if (authenticated) {
    redirect("/dashboard");
  }
  return (
    <>
      <section className="landing-grid-bg bg-background relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <div className="border-primary/20 bg-primary/10 text-primary mb-8 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium">
                <span className="bg-primary mr-2 flex h-2 w-2 animate-pulse rounded-full" />
                Open Source
              </div>
              <h1 className="text-foreground max-w-4xl text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
                Cloud workspaces for code, tests, and agents
              </h1>
            </div>

            <div className="lg:pb-3">
              <p className="text-muted-foreground max-w-xl text-xl leading-8 sm:text-2xl">
                Spin up a preconfigured instance with your repository, terminal,
                previews, and AI coding tools ready. Build without local setup
                or toolchain drift.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="bg-foreground text-background hover:bg-foreground/90 border-border h-12 border px-8 text-base"
                >
                  <Link href="https://l2.devsradar.com/signup">Sign up</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="bg-background text-foreground hover:bg-muted border-border h-12 px-8 text-base"
                >
                  <Link href="https://l2.devsradar.com/login">Login</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="border-border bg-card shadow-primary/10 mt-20 overflow-hidden rounded-2xl border shadow-2xl">
            <div className="border-border bg-muted/30 flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-muted-foreground text-xs font-medium">
                vibeongo.com
              </span>
            </div>

            <div className="bg-background">
              <Image
                src="/main.png"
                alt="Vibeongo cloud workspace dashboard"
                width={1919}
                height={964}
                priority
                sizes="(min-width: 1280px) 1280px, calc(100vw - 2rem)"
                className="h-auto w-full"
              />
            </div>
          </div>

          <LandingToolsStrip />
        </div>
      </section>

      <LandingFeatures />
      <LandingHowItWorks />
      <LandingFaq />

      <section className="landing-grid-bg bg-background relative overflow-hidden py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-card border-border rounded-3xl border p-12 text-center shadow-sm">
            <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-5xl">
              Skip the setup.
              <br />
              Stay in the creative flow.
            </h2>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
              Bring your repository and start building in an environment made
              for fast, AI-assisted iteration.
            </p>
            <div className="mt-10">
              <Button asChild size="lg" className="h-14 px-10 text-lg">
                <Link href="https://l2.devsradar.com/signup">
                  Get Started Now
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
