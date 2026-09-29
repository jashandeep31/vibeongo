import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Bell, Bot, SquareTerminal, Workflow } from "lucide-react";
import { Wordmark } from "@/components/landing-page/brand";
import { LandingFooter } from "@/components/landing-page/landing-footer";
import { GOOGLE_PLAY_URL } from "@/components/landing-page/links";
import { JsonLd } from "@/components/seo/json-ld";
import { getAppUrl } from "@/lib/app-url";
import { SITE_NAME, absoluteUrl, pageMetadata } from "@/lib/seo";
import appImage from "@/public/assets/app.png";
import googlePlayBadge from "@/public/assets/google-play-badge.png";

const title = "Mobile App for Android & iOS";
const description =
  "Steer your AI coding agents from your phone. The VibeOnGo mobile app brings agent chats, a native terminal, file review and automations to Android — iOS is coming soon.";

export const metadata: Metadata = {
  ...pageMetadata({ title, description, path: "/app" }),
  keywords: [
    "VibeOnGo app",
    "VibeOnGo Android",
    "VibeOnGo iOS",
    "AI coding agent mobile app",
    "code from phone",
    "mobile terminal",
    "cloud workspace app",
  ],
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": absoluteUrl("/app#webpage"),
      url: absoluteUrl("/app"),
      name: `${title} — ${SITE_NAME}`,
      description,
      isPartOf: { "@id": absoluteUrl("/#website") },
      about: { "@id": absoluteUrl("/app#mobile-app") },
      primaryImageOfPage: absoluteUrl("/assets/app.png"),
      breadcrumb: { "@id": absoluteUrl("/app#breadcrumb") },
    },
    {
      "@type": "MobileApplication",
      "@id": absoluteUrl("/app#mobile-app"),
      name: SITE_NAME,
      description,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Android",
      installUrl: GOOGLE_PLAY_URL,
      downloadUrl: GOOGLE_PLAY_URL,
      screenshot: absoluteUrl("/assets/app.png"),
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": absoluteUrl("/#organization") },
    },
    {
      "@type": "BreadcrumbList",
      "@id": absoluteUrl("/app#breadcrumb"),
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Mobile app", item: absoluteUrl("/app") },
      ],
    },
  ],
};

const highlights = [
  { icon: Bot, label: "Agent chats" },
  { icon: SquareTerminal, label: "Native terminal" },
  { icon: Workflow, label: "Automations" },
];

function AppleLogo() {
  return (
    <svg viewBox="0 0 384 512" className="size-[22px] fill-current" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export default function MobileAppPage() {
  return (
    <main className="flex min-h-screen flex-col overflow-hidden bg-lp-canvas text-lp-ink selection:bg-[#5b5cf0] selection:text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-lp-ink/10 bg-lp-surface/90 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-lp-surface/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <Link
            href={getAppUrl()}
            className="rounded-full border border-lp-ink/15 bg-lp-surface px-5 py-2.5 text-sm font-semibold text-lp-ink transition-colors hover:border-lp-ink/30"
          >
            Open web app
          </Link>
        </div>
      </nav>

      <JsonLd data={structuredData} />

      <section className="flex flex-1 items-center px-5 pt-28 pb-20 sm:px-8 sm:pt-32">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="lp-hero-in text-center lg:text-left">
            <p className="text-xs font-semibold tracking-[0.18em] text-lp-accent uppercase">
              VibeOnGo mobile
            </p>
            <h1 className="mt-5 text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl sm:leading-[1.02]">
              Your agents, one tap away.
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-8 text-pretty text-lp-ink/50 lg:mx-0">
              The code and the agent run in the cloud — your phone just steers.
              Answer questions, review changes and ship from anywhere.
            </p>

            <ul className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start">
              {highlights.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-lp-ink/10 bg-lp-surface px-3.5 py-1.5 text-sm text-lp-ink/70"
                >
                  <Icon className="size-3.5 text-lp-accent" />
                  {label}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <a
                href={GOOGLE_PLAY_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Get it on Google Play"
                className="-m-[11px] inline-block transition-transform hover:-translate-y-0.5"
              >
                {/* Official badge artwork; its transparent margin is Google's required clear space. */}
                <Image
                  src={googlePlayBadge}
                  alt="Get it on Google Play"
                  width={180}
                  height={70}
                  priority
                  className="h-[70px] w-[180px]"
                />
              </a>

              <div
                role="img"
                aria-label="Download on the App Store — coming soon"
                className="relative flex h-12 cursor-not-allowed items-center gap-2.5 rounded-[9px] border border-dashed border-lp-ink/25 bg-lp-surface px-4 text-lp-ink/45 select-none"
              >
                <AppleLogo />
                <span className="text-left leading-none">
                  <span className="block text-[10px]">Download on the</span>
                  <span className="mt-0.5 block text-[19px] font-semibold tracking-[-0.02em]">
                    App Store
                  </span>
                </span>
                <span className="absolute -top-3.5 -right-3 rounded-full bg-lp-accent px-2 py-0.5 text-[10px] font-semibold tracking-wide text-lp-on-ink uppercase shadow-[0_6px_16px_-6px_rgba(91,92,240,0.8)]">
                  Soon
                </span>
              </div>
            </div>

            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-lp-ink/40 lg:justify-start">
              <Bell className="size-3.5" />
              iOS is in the works — Android is available today.
            </p>
          </div>

          <div className="lp-phone-stage relative">
            <div className="lp-hero-glow absolute inset-6 rounded-full" />
            <Image
              src={appImage}
              alt="VibeOnGo mobile app showing workspace controls and an AI coding agent conversation"
              sizes="(max-width: 1024px) 90vw, 460px"
              priority
              className="lp-phone relative mx-auto h-auto w-full max-w-[420px]"
            />
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
