import { ArrowRight } from "lucide-react";
import Link from "next/link";

const pricingPoints = [
  "Usage-based billing",
  "Automatic shutdown",
  "Extend anytime",
  "VMs or sandboxes",
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="scroll-mt-16 bg-[#5b5cf0] px-5 py-24 text-white sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-2">
        <div>
          <h2 className="mt-7 text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl sm:leading-[1.02]">
            Pay for the work, not the waiting.
          </h2>
        </div>
        <div>
          <p className="max-w-xl text-lg leading-8 text-pretty text-white/70">
            Choose a full VM or a disposable sandbox. Usage is metered while it
            runs, and automatic expiration helps stop idle compute from draining
            your wallet.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs">
            {pricingPoints.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2"
              >
                {item}
              </span>
            ))}
          </div>
          <Link
            href="/pricing"
            className="mt-9 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#5b5cf0] transition-transform hover:-translate-y-0.5"
          >
            See VM and sandbox prices <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
