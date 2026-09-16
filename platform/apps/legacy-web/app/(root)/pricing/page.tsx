import type { Metadata } from "next";
import PricingClientView from "./client-view";

export const metadata: Metadata = {
  title: "Cloud Workspace Pricing — VibeOnGo",
  description:
    "Compare VibeOnGo virtual machine and sandbox pricing. Pay for cloud development workspaces on your schedule instead of keeping compute running around the clock.",
  alternates: {
    canonical: "https://vibeongo.com/pricing",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://vibeongo.com/pricing",
    siteName: "VibeOnGo",
    title: "Cloud Workspace Pricing — VibeOnGo",
    description:
      "Compare virtual machine and sandbox pricing for agent-ready cloud development workspaces.",
  },
  twitter: {
    card: "summary",
    title: "Cloud Workspace Pricing — VibeOnGo",
    description:
      "Compare virtual machine and sandbox pricing for agent-ready cloud development workspaces.",
  },
};

const pricingStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://vibeongo.com/pricing#webpage",
      url: "https://vibeongo.com/pricing",
      name: "Cloud Workspace Pricing — VibeOnGo",
      description:
        "Compare VibeOnGo virtual machine and sandbox pricing for cloud development workspaces.",
      isPartOf: {
        "@type": "WebSite",
        name: "VibeOnGo",
        url: "https://vibeongo.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does VibeOnGo pricing work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Virtual machines are billed per hour and sandboxes are billed per second. Use the calculator above to estimate base compute costs for the workspace type and schedule you choose.",
          },
        },
        {
          "@type": "Question",
          name: "What is the difference between a virtual machine and a sandbox?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Virtual machines are persistent workspaces for ongoing development. Sandboxes are disposable, isolated workspaces for short-lived or automated tasks.",
          },
        },
        {
          "@type": "Question",
          name: "Are network charges included in the estimates?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. The estimates cover base compute. Network-usage charges depend on how much data your workspace transfers.",
          },
        },
      ],
    },
  ],
};

export default function PricingPage() {
  return (
    <>
      <PricingClientView />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pricingStructuredData).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
