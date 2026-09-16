const tools = [
  "Claude Code",
  "Codex",
  "OpenCode",
  "T3Code",
  "Terminal",
  "SSH",
  "HTTPS Proxy",
];

export function LandingToolsStrip() {
  const marqueeTools = [...tools, ...tools];

  return (
    <section className="overflow-hidden pt-24">
      <div className="tools-marquee-mask">
        <div className="tools-marquee-track">
          {marqueeTools.map((tool, index) => (
            <span
              key={`${tool}-${index}`}
              className="text-muted-foreground/80 shrink-0 text-3xl font-bold tracking-tight sm:text-4xl"
              aria-hidden={index >= tools.length}
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
