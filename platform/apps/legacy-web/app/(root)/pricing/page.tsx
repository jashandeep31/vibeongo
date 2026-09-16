import type { Metadata } from "next";
import PricingClientView from "./client-view";

export const metadata: Metadata = {
  title: "Pricing — VibeOnGo",
  description: "VibeOnGo compute and sandbox pricing.",
};

export default function PricingPage() {
  return <PricingClientView />;
}
