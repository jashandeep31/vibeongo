import { ArrowRight, Bot, Layers, Terminal } from "lucide-react";

const features = [
  {
    icon: Terminal,
    title: "Terminals that stay alive.",
    copy: "Every terminal runs in tmux. Close the tab, switch to your phone, come back — the build is still running.",
  },
  {
    icon: Layers,
    title: "Parallel agents, zero collisions.",
    copy: "Each session gets its own runtime and working tree. One agent builds a feature while another reviews a PR.",
  },
  {
    icon: Bot,
    title: "Your agent, next to your code.",
    copy: "Codex, OpenCode, Pi and T3 Code read files, run tests, use Git and talk to the dev server. Save credentials once and reuse them across projects. Choose Build, Plan, Resolve issue or Review PR roles.",
  },
];
const extras = [
  {
    title: "Multiple repos",
    copy: "Many repos per project, each in its own folder.",
  },
  {
    title: "Docker services",
    copy: "Postgres, Redis and friends start with the app.",
  },
  {
    title: "VM or sandbox",
    copy: "Full machines or fast, disposable sandboxes.",
  },
  {
    title: "Auto-shutdown",
    copy: "Idle compute stops itself. You pay for work.",
  },
];
export function FeatureBento() {
  return (
    <section
      id="features"
      className="home-features"
      aria-labelledby="features-title"
    >
      <div className="home-container">
        <h2 id="features-title">
          Not just a chat.
          <br />A whole workspace.
        </h2>
        <div className="home-feature-grid">
          <div className="home-feature-preview">
            <h3>Every service gets a secure live URL.</h3>
            <p>
              Turn localhost into an HTTPS preview through VibeOnGo&apos;s
              proxy. Test UI changes, webhooks and APIs — or open the build on
              your phone. No certificates, tunnels or temporary deploys.
            </p>
            <div className="home-url" aria-label="Example preview URL">
              <span>localhost:3000</span>
              <strong>
                <ArrowRight size={16} aria-hidden="true" />
                https://3000-project.vibeongo.one
              </strong>
            </div>
          </div>
          <div className="home-feature-list">
            {features.map(({ icon: Icon, title, copy }) => (
              <div key={title}>
                <Icon size={21} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="home-feature-extras">
          {extras.map(({ title, copy }) => (
            <div key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
