import Link from "next/link";
import { Button } from "@repo/ui/components/button";
import { Check } from "lucide-react";

export function LandingPricing() {
  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No fixed tiers. No hidden fees. Pay only for the compute you use.
          </p>
        </div>
        
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-card/50 p-8 shadow-2xl backdrop-blur-sm lg:p-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl text-foreground">Pay-As-You-Go</h3>
              <p className="mt-2 text-muted-foreground">For indie hackers and fast-movers.</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold text-primary">$0</span>
              <span className="text-muted-foreground">/mo base</span>
            </div>
          </div>
          
          <ul className="space-y-4 mb-10">
            {[
              "Dedicated EC2 Instances",
              "Integrated AI Coding Assistants",
              "Custom Domains & Reverse Proxy",
              "Auto-Review & Create PRs",
              "Unlimited Projects",
              "Live Previews",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-muted-foreground">
                <Check className="h-5 w-5 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          
          <div className="rounded-2xl bg-primary/5 p-6 mb-10 border border-primary/10">
            <p className="text-sm text-center text-primary font-medium">
              You only pay for the AWS compute costs of your active instances + a small platform fee.
            </p>
          </div>
          
          <Button asChild className="w-full h-12 text-lg" size="lg">
            <Link href="/login">Get Started for Free</Link>
          </Button>
          
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Connect your GitHub account to begin. No credit card required to start.
          </p>
        </div>
      </div>
    </section>
  );
}
