import Link from "next/link";
import { Button } from "@repo/ui/components/button";
import { CheckCircle2, Zap } from "lucide-react";

export default function Page() {
  return (
    <div className="bg-background relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* Background glow effects */}
      <div className="bg-primary/20 pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />

      <div className="z-10 w-full max-w-5xl text-center">
        {/* Badge */}
        <div className="border-primary/20 bg-primary/10 text-primary mb-6 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium">
          <span className="bg-primary mr-2 flex h-2 w-2 animate-pulse rounded-full"></span>
          Now with seamless integrations
        </div>

        {/* Main Headline */}
        <h1 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="block">Vibe Code On Go</span>
          <span className="text-primary mt-2 block">Anywhere, Any Device</span>
        </h1>

        {/* Subheadline */}
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg sm:text-xl">
          Experience a full-fledged development environment right in your
          browser. Stay notified and resolve issues faster with real-time
          alerts.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* Github Sign up button */}
          <Button
            asChild
            size="lg"
            className="h-12 border border-gray-300 bg-white px-8 text-base text-black hover:bg-gray-200"
          >
            <Link href="/login" className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 rounded-full bg-white p-0.5"
                fill="currentColor"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Github
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

        {/* Visual Element (Mock Messaging UI) */}
        <div className="relative mx-auto mt-20 max-w-4xl">
          <div className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Telegram Card */}
            <div className="border-border bg-card/60 flex transform flex-col rounded-2xl border p-6 shadow-xl backdrop-blur-sm transition-transform hover:-translate-y-2">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2AABEE]/20">
                  <svg
                    className="h-5 w-5 text-[#2AABEE]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Telegram Alert</p>
                  <p className="text-muted-foreground text-xs">Just now</p>
                </div>
              </div>
              <div className="bg-background/50 border-border rounded-lg border p-4 text-left text-sm">
                <p className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-400">
                    <Zap className="h-4 w-4" />
                  </span>
                  <span>
                    <strong>Server Monitor:</strong> Memory usage normalized.
                    Issue fixed seamlessly.
                  </span>
                </p>
              </div>
            </div>

            {/* Slack Card */}
            <div className="border-border bg-card/60 flex transform flex-col rounded-2xl border p-6 shadow-xl backdrop-blur-sm transition-transform hover:-translate-y-10 md:-translate-y-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.52h-2.522v-2.52zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.958a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.52v-2.522h2.52zM15.165 17.687a2.528 2.528 0 0 1-2.52-2.521 2.528 2.528 0 0 1 2.52-2.521h6.313A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.313z"
                      fill="#E01E5A"
                    />
                    <path
                      d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z"
                      fill="#36C5F0"
                    />
                    <path
                      d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.52h-2.522v-2.52z"
                      fill="#2EB67D"
                    />
                    <path
                      d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z"
                      fill="#ECB22E"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Slack Bot</p>
                  <p className="text-muted-foreground text-xs">2 mins ago</p>
                </div>
              </div>
              <div className="bg-background/50 border-border rounded-lg border p-4 text-left text-sm">
                <p className="flex items-start gap-2">
                  <span className="mt-0.5 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <span>
                    <strong>Bug #142 fixed:</strong> Authentication layer
                    deployed to production successfully. 🚀
                  </span>
                </p>
              </div>
            </div>

            {/* Discord Card */}
            <div className="border-border bg-card/60 flex transform flex-col rounded-2xl border p-6 shadow-xl backdrop-blur-sm transition-transform hover:-translate-y-2">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5865F2]/20">
                  <svg
                    className="h-5 w-5 text-[#5865F2]"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Discord Bot</p>
                  <p className="text-muted-foreground text-xs">5 mins ago</p>
                </div>
              </div>
              <div className="bg-background/50 border-border rounded-lg border p-4 text-left text-sm">
                <p className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✨</span>
                  <span>
                    <strong>Deployment:</strong> Build for <code>vibe-app</code>{" "}
                    completed. Environment ready.
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Decorative lines behind the cards */}
          <div className="via-primary/30 absolute top-1/2 left-0 -z-10 hidden h-[1px] w-full bg-gradient-to-r from-transparent to-transparent md:block" />
        </div>
      </div>
    </div>
  );
}
