import { CircleDollarSign } from "lucide-react";

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
      className="bg-[#5b5cf0] px-5 py-24 text-white sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-2">
        <div>
          <CircleDollarSign className="size-7 text-white/80" />
          <h2 className="mt-7 text-4xl leading-tight font-semibold tracking-[-0.045em] sm:text-6xl">
            Pay for the work, not the waiting.
          </h2>
        </div>
        <div>
          <p className="max-w-xl text-lg leading-8 text-white/70">
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
        </div>
      </div>
    </section>
  );
}
