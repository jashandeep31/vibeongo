import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutomationSection } from "@/components/landing-page/automation-section";
import { BlueprintShowcase } from "@/components/landing-page/blueprint-showcase";
import { Wordmark } from "@/components/landing-page/brand";
import { ClosingCta } from "@/components/landing-page/closing-cta";
import { FaqSection, faqs } from "@/components/landing-page/faq-section";
import { FeatureBento } from "@/components/landing-page/feature-bento";
import { ForgejoSection } from "@/components/landing-page/forgejo-section";
import { Hero } from "@/components/landing-page/hero";
import { LandingFooter } from "@/components/landing-page/landing-footer";
import { GITHUB_REPOSITORY_URL, GOOGLE_PLAY_URL } from "@/components/landing-page/links";
import { MobileShowcase } from "@/components/landing-page/mobile-showcase";
import { PricingSection } from "@/components/landing-page/pricing-section";
import { SafetySection } from "@/components/landing-page/safety-section";
import { WorkflowSection } from "@/components/landing-page/workflow-section";
import { JsonLd } from "@/components/seo/json-ld";
import { getAppUrl } from "@/lib/app-url";
import { isAuthenticated } from "@/lib/get-session";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  absoluteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  // Absolute: the home page carries the brand first, not the "%s — VibeOnGo" template.
  title: { absolute: `${SITE_NAME} — ${SITE_TAGLINE}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/") },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": absoluteUrl("/#organization"),
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/vibeongologo.png"),
      sameAs: [GITHUB_REPOSITORY_URL, "https://x.com/Jashandeep31", GOOGLE_PLAY_URL],
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": absoluteUrl("/#organization") },
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      "@id": absoluteUrl("/#software"),
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web, Android",
      downloadUrl: GOOGLE_PLAY_URL,
      screenshot: [absoluteUrl("/assets/hero.png"), absoluteUrl("/assets/app.png")],
      publisher: { "@id": absoluteUrl("/#organization") },
    },
    {
      "@type": "FAQPage",
      "@id": absoluteUrl("/#faq"),
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

const navLinks = [
  { href: "#platform", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#automation", label: "Automations" },
  { href: "#forgejo", label: "Forgejo" },
  { href: "#mobile", label: "Mobile" },
  { href: "/pricing", label: "Pricing" },
];

export default async function Page() {
  const authenticated = await isAuthenticated();
  const appLoginUrl = getAppUrl("/login");

  if (authenticated) {
    redirect(getAppUrl());
  }

  return (
    <main className="min-h-screen overflow-hidden bg-lp-canvas text-lp-ink selection:bg-[#5b5cf0] selection:text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-lp-ink/10 bg-lp-surface/90 shadow-[0_8px_30px_-18px_rgba(23,24,28,0.25)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-lp-surface/70 dark:shadow-[0_8px_30px_-18px_rgba(0,0,0,0.8)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <div className="hidden items-center gap-7 text-sm text-lp-ink/55 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-lp-ink"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-2.5 sm:flex">
            <Link
              href={appLoginUrl}
              className="rounded-full border border-lp-ink/15 bg-lp-surface px-5 py-2.5 text-sm font-semibold text-lp-ink transition-colors hover:border-lp-ink/30"
            >
              Log in
            </Link>
            <Link
              href={appLoginUrl}
              className="rounded-full bg-[#5b5cf0] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(91,92,240,0.7)] transition-transform hover:-translate-y-0.5"
            >
              Start building
            </Link>
          </div>
          <Link
            href={appLoginUrl}
            className="rounded-full bg-[#5b5cf0] px-4 py-2 text-xs font-semibold text-white shadow-[0_6px_18px_-6px_rgba(91,92,240,0.7)] sm:hidden"
          >
            Start
          </Link>
        </div>
      </nav>

      <JsonLd data={structuredData} />
      <Hero appLoginUrl={appLoginUrl} />
      <WorkflowSection />
      <FeatureBento />
      <AutomationSection />
      <ForgejoSection />
      <MobileShowcase />
      <BlueprintShowcase />
      <SafetySection />
      <PricingSection />
      <FaqSection />
      <ClosingCta />
      <LandingFooter />
    </main>
  );
}
