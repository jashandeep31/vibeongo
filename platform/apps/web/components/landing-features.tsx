import { Laptop, Wand2, Play, GitPullRequest } from "lucide-react";

const features = [
  {
    title: "Ready-to-Code Workspace",
    description:
      "Open your repository in an isolated environment with the tools and terminal you need already available.",
    icon: Laptop,
  },
  {
    title: "AI-Assisted Building",
    description:
      "Use OpenCode, Claude, or Codex to understand your codebase, create features, and fix issues from one workspace.",
    icon: Wand2,
  },
  {
    title: "Live Project Previews",
    description:
      "Run your application and see changes as you make them without switching back to a local development setup.",
    icon: Play,
  },
  {
    title: "GitHub-Native Workflow",
    description:
      "Turn your work into clear commits and pull requests while keeping your existing GitHub workflow.",
    icon: GitPullRequest,
  },
];

export function LandingFeatures() {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to stay in flow
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            A focused environment for exploring ideas, editing code, and
            previewing the result.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="group relative">
              <div className="bg-primary/10 text-primary group-hover:bg-primary/20 mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-colors">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-foreground mb-3 text-xl font-semibold">
                {feature.title}
              </h3>
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
