export function LandingHowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Connect Your Repo",
      description:
        "Link your GitHub account and choose the project you want to work on.",
    },
    {
      number: "02",
      title: "Start Vibe Coding",
      description:
        "Open your ready-to-use workspace and tell your preferred AI coding assistant what you want to build or fix.",
    },
    {
      number: "03",
      title: "Preview & Share",
      description:
        "Run the project, review your changes live, and create a pull request when your work is ready.",
    },
  ];

  return (
    <section className="border-y border-white/5 bg-black/20 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Go from an idea to working code without setting up a local
            environment.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="text-primary/10 mb-6 text-5xl font-bold">
                {step.number}
              </div>
              <h3 className="text-foreground mb-3 text-xl font-semibold">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
