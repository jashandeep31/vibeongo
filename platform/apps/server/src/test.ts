import { DaytonaClient } from "./providers/client/daytona-client.js";
import { E2BClient } from "./providers/client/e2b-client.js";
import { VercelSandboxClient } from "./providers/client/vercel-sandbox-client.js";

export default async function test() {
  console.log("Running test");

  // const e2bClient = new E2BClient();
  // await e2bClient.terminateInstance("e2b-ttest");
  // const daytonaClient = new DaytonaClient();
  // await daytonaClient.terminateInstance("daytona-ttest");
  //
  // const vercelClient = new VercelSandboxClient();
  // await vercelClient.terminateInstance("vercel-ttest");
}
