import Link from "next/link";
import { Button } from "@repo/ui/components/button";

export function LandingNavbar() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b">
      <div className="bg-background/80 border-b border-white/10 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
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
              <Link href="/signup">Sign up</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
