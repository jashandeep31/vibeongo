import "./lib/sentry.js";
import "./jobs/repo-overview-worker.js";
import "./jobs/sandbox-setup-worker.js";
import "./jobs/user-onboarding-worker.js";
import "./jobs/instance-termination-worker.js";
import "./jobs/git-repo-access-token-revocation-worker.js";
import "./jobs/project-automation-webhook-worker.js";
import "./jobs/project-automation-schedule-worker.js";
import "./lib/cron.js";

console.log("Background workers started");
