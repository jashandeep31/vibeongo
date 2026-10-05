const workflow = [
  {
    title: "Connect your code",
    description:
      "Bring a GitHub repository or create one on the built-in Forgejo. Attach one or many repos to a project.",
  },
  {
    title: "Describe the environment once",
    description:
      "Scripts, Docker services, preview ports, SSH keys and agent config become a reusable project blueprint.",
  },
  {
    title: "Launch a session",
    description:
      "Pick a VM or sandbox and add tasks. Each session gets its own isolated runtime, so agents never collide.",
  },
  {
    title: "Work with the agent",
    description:
      "Chat, answer questions, inspect tool calls and open terminals — from the browser or the Android app.",
  },
  {
    title: "Preview and ship",
    description:
      "Test on a live HTTPS URL, run checks, and send the work back through a pull request to a protected main.",
  },
  {
    title: "Shut it down",
    description:
      "Stop the runtime yourself or let auto-expiry do it. Your blueprint and session history stay for next time.",
  },
];

export function WorkflowSection() {
  return (
    <section
      id="platform"
      className="home-workflow"
      aria-labelledby="workflow-title"
    >
      <div className="home-container">
        <div className="home-section-heading">
          <h2 id="workflow-title">Build, run, review and ship in one place.</h2>
          <p>
            VibeOnGo doesn&apos;t replace Git, your cloud or your agent. It
            connects them into one workflow with a reproducible environment for
            every task.
          </p>
        </div>
        <ol className="home-workflow-list">
          {workflow.map((step, index) => (
            <li key={step.title}>
              <span className="home-step-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
