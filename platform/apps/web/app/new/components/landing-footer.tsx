import Link from "next/link";
import { Wordmark } from "./brand";
import { GITHUB_REPOSITORY_URL } from "./links";

export function LandingFooter() {
  return (
    <footer className="border-t border-black/10 px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <Wordmark />
        <p className="text-xs text-black/35">
          Cloud workspaces for developers and agents.
        </p>
        <div className="flex gap-6 text-xs text-black/45">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={GITHUB_REPOSITORY_URL}>GitHub</a>
        </div>
      </div>
    </footer>
  );
}
