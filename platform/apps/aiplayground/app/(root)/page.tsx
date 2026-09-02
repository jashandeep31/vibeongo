import type { Metadata } from "next";
import ClientView from "./client-view";

export const metadata: Metadata = {
  title: "VibeOnGo — Cloud workspaces for developers and agents",
  description:
    "Launch agent-ready cloud workspaces with persistent terminals, live HTTPS previews, repository automation, and mobile control.",
  alternates: {
    canonical: "https://app.vibeongo.com",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://app.vibeongo.com",
    siteName: "VibeOnGo",
    title: "VibeOnGo — Cloud workspaces for developers and agents",
    description:
      "Launch agent-ready cloud workspaces with persistent terminals, live HTTPS previews, repository automation, and mobile control.",
    images: [
      {
        url: "https://app.vibeongo.com/assets/hero.png",
        width: 1920,
        height: 1338,
        alt: "VibeOnGo cloud workspace dashboard with mobile access",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@Jashandeep31",
    creator: "@Jashandeep31",
    title: "VibeOnGo — Cloud workspaces for developers and agents",
    description:
      "Launch agent-ready cloud workspaces with persistent terminals, live HTTPS previews, repository automation, and mobile control.",
    images: ["https://app.vibeongo.com/assets/hero.png"],
  },
};

export default function Home() {
  return <ClientView />;
}
