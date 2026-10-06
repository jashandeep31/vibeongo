import type { Metadata } from "next";
import "../../home.css";
import "./pricing.css";
import { BACKEND_URL } from "@/lib/constants";
import type { PricingMetadata } from "@/services/instance-metadata-service";
import PricingClientView from "./client-view";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

export const revalidate = 60;

async function getPricingMetadata(): Promise<PricingMetadata> {
  async function getMetadata<T>(path: string): Promise<T> {
    const response = await fetch(`${BACKEND_URL}/api/v1/metadata/${path}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      throw new Error(`Unable to load pricing metadata: ${response.status}`);
    }
    const body: { data: T } = await response.json();
    return body.data;
  }

  const [instanceRegions, sandboxRegions] = await Promise.all([
    getMetadata<PricingMetadata["instances"][number]["region"][]>(
      "instances/regions",
    ),
    getMetadata<PricingMetadata["sandboxes"][number]["region"][]>(
      "sandboxes/regions",
    ),
  ]);

  const [instances, sandboxes] = await Promise.all([
    Promise.all(
      instanceRegions.map(async (region) => ({
        region,
        types: await getMetadata<PricingMetadata["instances"][number]["types"]>(
          `instances/regions/${encodeURIComponent(region.id)}/types`,
        ),
      })),
    ),
    Promise.all(
      sandboxRegions.map(async (region) => ({
        region,
        types: await getMetadata<PricingMetadata["sandboxes"][number]["types"]>(
          `sandboxes/regions/${encodeURIComponent(region.id)}/types`,
        ),
      })),
    ),
  ]);

  return {
    instances: instances
      .map(({ region, types }) => ({
        region,
        types: types.filter((type) => type.enabled === true),
      }))
      .filter(({ types }) => types.length > 0),
    sandboxes: sandboxes
      .map(({ region, types }) => ({
        region,
        types: types.filter((type) => type.enabled === true),
      }))
      .filter(({ types }) => types.length > 0),
  };
}

export const metadata: Metadata = pageMetadata({
  title: "Cloud Workspace Pricing",
  description:
    "Compare VibeOnGo virtual machine and sandbox pricing. Sandboxes and VMs bill per started minute, and auto-shutdown stops idle compute — pay for the work, not the waiting.",
  path: "/pricing",
});

const pricingStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": absoluteUrl("/pricing#webpage"),
      url: absoluteUrl("/pricing"),
      name: "Cloud Workspace Pricing — VibeOnGo",
      description:
        "Compare VibeOnGo virtual machine and sandbox pricing for cloud development workspaces.",
      isPartOf: { "@id": absoluteUrl("/#website") },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does VibeOnGo pricing work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sandboxes and virtual machines are billed per started minute. The 30-day estimates assume 8 hours a day, 5 days a week. Prices include the VibeOnGo management charge.",
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
          name: "Are network charges included in the prices?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Prices and estimates cover base compute. Network-usage charges depend on how much data your workspace transfers.",
          },
        },
      ],
    },
  ],
};

export default async function PricingPage() {
  const pricing = await getPricingMetadata().catch(() => null);
  return (
    <>
      <PricingClientView data={pricing} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pricingStructuredData).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
    </>
  );
}
