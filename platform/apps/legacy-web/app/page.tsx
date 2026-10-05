import type { Metadata } from "next";
import "./home.css";
import { redirect } from "next/navigation";
import { AutomationSection } from "@/components/landing-page/automation-section";
import { BlueprintShowcase } from "@/components/landing-page/blueprint-showcase";
import { LandingHeader } from "@/components/landing-page/landing-header";
import { ClosingCta } from "@/components/landing-page/closing-cta";
import { FaqSection, faqs } from "@/components/landing-page/faq-section";
import { FeatureBento } from "@/components/landing-page/feature-bento";
import { ForgejoSection } from "@/components/landing-page/forgejo-section";
import { Hero } from "@/components/landing-page/hero";
import { LandingFooter } from "@/components/landing-page/landing-footer";
import {
  GITHUB_REPOSITORY_URL,
  GOOGLE_PLAY_URL,
} from "@/components/landing-page/links";
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
      sameAs: [
        GITHUB_REPOSITORY_URL,
        "https://x.com/Jashandeep31",
        GOOGLE_PLAY_URL,
      ],
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
      screenshot: [
        absoluteUrl("/assets/hero.png"),
        absoluteUrl("/assets/app.png"),
      ],
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

export default async function Page() {
  const authenticated = await isAuthenticated();
  const appLoginUrl = getAppUrl("/login");

  if (authenticated) {
    redirect(getAppUrl());
  }

  return (
    <div className="home-page">
      <a href="#home-content" className="home-skip-link">
        Skip to content
      </a>
      <LandingHeader appLoginUrl={appLoginUrl} />
      <main id="home-content">
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
      </main>
      <LandingFooter />
    </div>
  );
}
