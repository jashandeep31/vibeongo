import Image from "next/image";

const features = [
  {
    title: "AI agents, preconfigured",
    description:
      "Access Claude Code, Codex, OpenCode, and T3 from one cloud workspace.",
    image: "/features/01.png",
  },
  {
    title: "Ready cloud workspaces",
    description:
      "Open your repo in an isolated machine with tools, terminal, and project setup already in place.",
    image: "/features/02.png",
  },
  {
    title: "SSH access from anywhere",
    description:
      "Add SSH keys once and connect to your workspace from any machine.",
    image: "/features/03.png",
  },
  {
    title: "Fast terminal access",
    description:
      "Use Termius and Mosh for responsive remote development sessions.",
    image: "/features/04.png",
  },
  {
    title: "HTTPS previews for dev servers",
    description:
      "Expose local dev servers through dedicated proxy domains with HTTPS.",
    image: "/features/05.png",
  },
];

export function LandingFeatures() {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-3xl">
          <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
            Why choose us?
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-8">
            Everything your project needs to start building in the cloud.
          </p>
        </div>

        <div className="space-y-16">
          {features.map((feature, index) => {
            const reversed = index % 2 === 1;
            const number = String(index + 1).padStart(2, "0");

            return (
              <div
                key={feature.title}
                className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
              >
                <div
                  className={`border-border border-l pl-6 ${
                    reversed ? "lg:order-2" : ""
                  }`}
                >
                  <div className="mb-5 flex items-center gap-4">
                    <span className="text-primary/35 text-5xl font-bold leading-none">
                      {number}
                    </span>
                  </div>
                  <h3 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground mt-5 max-w-xl text-lg leading-8">
                    {feature.description}
                  </p>
                </div>

                <div className="bg-muted border-border overflow-hidden rounded-2xl border">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={480}
                    height={360}
                    sizes="(min-width: 1024px) 50vw, calc(100vw - 2rem)"
                    className="h-auto w-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
