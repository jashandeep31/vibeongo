import { Cpu, Wand2, Globe, GitPullRequest } from "lucide-react";

const features = [
  {
    title: "Dedicated Compute",
    description: "Every project gets its own dedicated EC2 VPS instance. No noisy neighbors, just raw performance with custom domain support via reverse proxy.",
    icon: Cpu,
  },
  {
    title: "AI Supercharged",
    description: "Integrated OpenCode, Claude, and Codex assistants. Chat with your codebase and watch the AI make surgical changes in real-time.",
    icon: Wand2,
  },
  {
    title: "Instant Live Previews",
    description: "View your changes exactly as they'll appear in production. Our custom reverse proxy gives you an instant URL for every instance.",
    icon: Globe,
  },
  {
    title: "GitHub Native Workflow",
    description: "Auto-review PRs and generate intelligent commits. Tag the AI to create PRs for you, just like Copilot Workspace.",
    icon: GitPullRequest,
  },
];

export function LandingFeatures() {
  return (
    <section className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to ship faster
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Stop worrying about infrastructure and start focusing on your code.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="relative group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6 transition-colors group-hover:bg-primary/20">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
