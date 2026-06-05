export function LandingHowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Connect Your Repo",
      description: "Link your GitHub account and select the project you want to work on. We handle the rest.",
    },
    {
      number: "02",
      title: "AI Provisions & Edits",
      description: "We spin up a dedicated EC2 instance and load the AI environment. Tell the assistant what to build or fix.",
    },
    {
      number: "03",
      title: "Preview & Ship",
      description: "View your changes live on a custom URL. Once satisfied, auto-generate a PR and merge your changes.",
    },
  ];

  return (
    <section className="py-24 border-y border-white/5 bg-black/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Get from idea to production in minutes, not hours.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="text-5xl font-bold text-primary/10 mb-6">{step.number}</div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
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
