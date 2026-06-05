import Link from "next/link";
import { Button } from "@repo/ui/components/button";
import { getSession } from "@/lib/getSession";
import { redirect } from "next/navigation";
import { LandingFeatures } from "@/components/landing-features";
import { LandingHowItWorks } from "@/components/landing-how-it-works";
import { LandingPricing } from "@/components/landing-pricing";

export default async function Page() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }
  return (
    <>
      <section className="bg-background relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        {/* Background glow effects */}
        <div className="bg-primary/20 pointer-events-none absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />

        <div className="z-10 w-full max-w-5xl text-center">
          {/* Badge */}
          <div className="border-primary/20 bg-primary/10 text-primary mb-6 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium">
            <span className="bg-primary mr-2 flex h-2 w-2 animate-pulse rounded-full"></span>
            Built for Indie Hackers
          </div>

          {/* Main Headline */}
          <h1 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block">Deploy, Edit with AI,</span>
            <span className="text-primary mt-2 block">& Preview Live</span>
          </h1>

          {/* Subheadline */}
          <p className="text-muted-foreground mx-auto mt-6 max-w-3xl text-lg sm:text-xl">
            Spin up a dedicated EC2 instance for your project in seconds. Use{" "}
            <span className="text-foreground font-semibold">
              OpenCode, Claude, or Codex
            </span>{" "}
            to make changes, get live previews on your custom domain, and
            auto-manage your PRs.{" "}
            <span className="text-foreground font-semibold">
              {" "}
              Pay only for what you use.
            </span>
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {/* GitHub sign up button */}
            <Button
              asChild
              size="lg"
              className="h-12 border border-gray-300 bg-white px-8 text-base text-black hover:bg-gray-200"
            >
              <Link href="/login" className="flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.699-2.782.605-3.369-1.344-3.369-1.344-.455-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.004.071 1.532 1.032 1.532 1.032.893 1.531 2.341 1.089 2.91.833.091-.647.35-1.089.636-1.339-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.987 1.029-2.687-.103-.253-.446-1.272.098-2.65 0 0 .839-.269 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.53 9.53 0 0 1 2.504.337c1.909-1.295 2.747-1.026 2.747-1.026.546 1.378.203 2.397.1 2.65.64.7 1.028 1.594 1.028 2.687 0 3.848-2.339 4.695-4.566 4.943.359.31.678.92.678 1.855 0 1.339-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
                </svg>
                Continue with GitHub
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="bg-background text-foreground hover:bg-muted h-12 px-8 text-base"
            >
              <Link
                href="https://github.com/jashandeep31/vibeongo"
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <LandingFeatures />
      <LandingHowItWorks />
      <LandingPricing />

      <section className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-card/30 p-12 text-center border border-white/10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Stop configuring environments.<br />Start shipping.
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Join the indie hackers who are already using VibeOnGo to build and iterate at the speed of thought.
            </p>
            <div className="mt-10">
              <Button asChild size="lg" className="h-14 px-10 text-lg">
                <Link href="/login">Get Started Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
