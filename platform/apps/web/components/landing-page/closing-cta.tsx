import { ArrowRight, Cloud, Github } from "lucide-react";
import Link from "next/link";
import { GITHUB_REPOSITORY_URL } from "./links";

export function ClosingCta() {
  return (
    <section className="relative px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#17181c] px-6 py-16 text-center text-white sm:px-12 sm:py-24">
        <Cloud className="mx-auto size-7 text-[#a7a8ff]" />
        <h2 className="mx-auto mt-7 max-w-4xl text-4xl leading-tight font-semibold tracking-[-0.05em] sm:text-6xl">
          From idea to running code, without returning to your desk.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/45">
          Bring a repository and a task. VibeOnGo prepares everything else.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-[#17181c] hover:bg-white/90"
          >
            Start building <ArrowRight className="size-4" />
          </Link>
          <a
            href={GITHUB_REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-7 text-sm font-semibold text-white hover:bg-white/5"
          >
            <Github className="size-4" /> View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
