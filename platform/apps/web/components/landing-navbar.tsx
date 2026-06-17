import Link from "next/link";
import { Button } from "@repo/ui/components/button";

export function LandingNavbar() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50">
      <div className="bg-background/80 border-b border-white/10 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-foreground text-xl font-bold tracking-tight"
          >
            VibeOnGo
          </Link>
          <nav className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Join Waitlist</Link>
            </Button>
          </nav>
        </div>
      </div>

      <div className="border-primary/20 bg-primary/10 text-primary flex h-9 items-center justify-center border-b px-4 text-center text-xs font-medium sm:text-sm">
        <span className="bg-primary mr-2 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" />
        VibeOnGo signup is invite-only. Join the waitlist and we will let you
        know when access is available.
      </div>
    </header>
  );
}
