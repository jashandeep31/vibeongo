import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowDownToLine,
  Bot,
  Smartphone,
  SquareTerminal,
  Workflow,
} from "lucide-react";
import { LandingHeader } from "@/components/landing-page/landing-header";
import "../home.css";
import "./app.css";
import { LandingFooter } from "@/components/landing-page/landing-footer";
import { GOOGLE_PLAY_URL } from "@/components/landing-page/links";
import { JsonLd } from "@/components/seo/json-ld";
import { getAppUrl } from "@/lib/app-url";
import { SITE_NAME, absoluteUrl, pageMetadata } from "@/lib/seo";
import appImage from "@/public/assets/app.png";

const title = "Download the VibeOnGo App";
const description =
  "Steer your AI coding agents from your phone. The VibeOnGo mobile app brings agent chats, a native terminal, file review and automations to Android — iOS is coming soon.";

export const metadata: Metadata = {
  ...pageMetadata({ title, description, path: "/app" }),
  openGraph: {
    ...pageMetadata({ title, description, path: "/app" }).openGraph,
    images: [
      {
        url: absoluteUrl("/app/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "VibeOnGo mobile app — Android available, iOS coming soon",
      },
    ],
  },
  twitter: {
    ...pageMetadata({ title, description, path: "/app" }).twitter,
    images: [absoluteUrl("/app/opengraph-image")],
  },
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
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Mobile app",
          item: absoluteUrl("/app"),
        },
      ],
    },
  ],
};

const highlights = [
  { icon: Bot, label: "Agent chats" },
  { icon: SquareTerminal, label: "Native terminal" },
  { icon: Workflow, label: "Automations" },
];

export default function MobileAppPage() {
  return (
    <div className="home-page mobile-download-page">
      <a href="#app-content" className="home-skip-link">
        Skip to content
      </a>
      <LandingHeader appLoginUrl={getAppUrl("/login")} />
      <main id="app-content">
        <JsonLd data={structuredData} />
        <section className="app-download-hero" aria-labelledby="app-title">
          <div className="app-download-copy">
            <h1 id="app-title">
              Your workspace.
              <br />
              In your pocket.
            </h1>
            <p>
              The code and the agent run in the cloud. Answer questions, review
              changes, and build from anywhere with VibeOnGo on your phone.
            </p>
            <div className="app-download-actions">
              <a
                href={GOOGLE_PLAY_URL}
                className="home-button home-button-blue"
              >
                <ArrowDownToLine size={20} aria-hidden="true" />
                Download for Android
              </a>
              <button type="button" disabled className="app-ios-button">
                <Smartphone size={20} aria-hidden="true" />
                <span>
                  Download for iOS<small>Coming soon</small>
                </span>
              </button>
            </div>
            <p className="app-store-note">
              Android is available on Google Play. iOS is coming soon.
            </p>
            <ul className="app-highlights" aria-label="Mobile app features">
              {highlights.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <figure className="app-download-preview">
            <Image
              src={appImage}
              alt="VibeOnGo Android app showing workspace controls and an AI coding agent conversation"
              sizes="(max-width: 760px) 300px, 380px"
              priority
            />
            <figcaption>The VibeOnGo Android app</figcaption>
          </figure>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
