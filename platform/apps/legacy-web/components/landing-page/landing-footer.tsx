import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";
import { getAppUrl } from "@/lib/app-url";
import googlePlayBadge from "@/public/assets/google-play-badge.png";
import { Wordmark } from "./brand";
import { GITHUB_REPOSITORY_URL, GOOGLE_PLAY_URL } from "./links";
import { ThemeSwitcher } from "./theme-switcher";

type FooterLink = { label: string; href: string; external?: boolean };

const X_URL = "https://x.com/Jashandeep31";

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#platform" },
      { label: "Features", href: "/#features" },
      { label: "Automations", href: "/#automation" },
      { label: "Built-in Forgejo", href: "/#forgejo" },
      { label: "Mobile app", href: "/app" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Open the web app", href: getAppUrl(), external: true },
      {
        label: "Sign in with GitHub",
        href: getAppUrl("/login"),
        external: true,
      },
      { label: "Android app", href: "/app" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Community",
    links: [
      {
        label: "Source on GitHub",
        href: GITHUB_REPOSITORY_URL,
        external: true,
      },
      {
        label: "Report an issue",
        href: `${GITHUB_REPOSITORY_URL}/issues`,
        external: true,
      },
      { label: "Follow on X", href: X_URL, external: true },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      {
        label: "License (ELv2)",
        href: `${GITHUB_REPOSITORY_URL}/blob/main/LICENSE`,
        external: true,
      },
    ],
  },
];

function FooterAnchor({ link }: { link: FooterLink }) {
  const className =
    "group inline-flex items-center gap-1 text-sm text-lp-ink/75 transition-colors hover:text-lp-ink";
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {link.label}
        <ArrowUpRight className="text-lp-ink/25 group-hover:text-lp-ink/60 size-3.5 transition-colors" />
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-lp-ink/10 bg-lp-canvas border-t px-5 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.2fr_2fr] lg:gap-16">
          <div className="max-w-sm">
            <Wordmark />
            <p className="text-lp-ink/75 mt-5 text-sm leading-6 text-pretty">
              Cloud workspaces for AI coding agents. Connect a repository,
              launch a VM or sandbox, and ship from the web or your phone.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <a
                href={GITHUB_REPOSITORY_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="VibeOnGo on GitHub"
                className="border-lp-ink/10 bg-lp-surface text-lp-ink/60 hover:text-lp-ink flex size-10 items-center justify-center rounded-xl border transition-colors"
              >
                <Github className="size-[18px]" strokeWidth={1.75} />
              </a>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="VibeOnGo on X"
                className="border-lp-ink/10 bg-lp-surface text-lp-ink/60 hover:text-lp-ink flex size-10 items-center justify-center rounded-xl border transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-4 fill-current"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
            <a
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get it on Google Play"
              className="mt-4 -ml-[9px] inline-block"
            >
              <Image
                src={googlePlayBadge}
                alt="Get it on Google Play"
                width={150}
                height={58}
                className="h-[58px] w-[150px]"
              />
            </a>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4"
          >
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-lp-ink/65 text-xs font-semibold tracking-[0.14em] uppercase">
                  {column.title}
                </p>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterAnchor link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-lp-ink/10 text-lp-ink/65 flex flex-col gap-3 border-t py-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <p>© {new Date().getFullYear()} VibeOnGo. All rights reserved.</p>
          </div>
          <p>
            Source available under the{" "}
            <a
              href={`${GITHUB_REPOSITORY_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="decoration-lp-ink/20 hover:text-lp-ink/70 underline underline-offset-2"
            >
              Elastic License 2.0
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
