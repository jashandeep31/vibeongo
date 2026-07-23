import dotenv from "dotenv";
dotenv.config();
import { Sandbox } from "e2b";
import { env } from "./lib/env.js";

export default async function test() {
  // const sandbox = await Sandbox.create("opencode", {
  //   envs: {},
  //   timeoutMs: 600_000,
  // });
  //
  // // await sandbox.git.clone("https://github.com/your-org/your-repo.git", {
  // //   path: "/home/user/repo",
  // //   username: "x-access-token",
  // //   password: "",
  // //   depth: 1,
  // // });
  //
  // // const result = await sandbox.commands.run(
  // //   `cd /home/user/repo && opencode run "Add error handling to all API endpoints"`,
  // //   // { onStdout: (data) => process.stdout.write(data) },
  // // );
  //
  // // const diff = await sandbox.commands.run("cd /home/user/repo && git diff");
  // // console.log(diff.stdout);
  //
  // const res = await sandbox.kill();
  // console.log(res);
  //
  // const id = sandbox.sandboxId;
  //
  // setTimeout(async () => {
  //   console.log("Runs after 2 seconds");
  //   const sandbox = await Sandbox.connect(id);
  //   const res = await sandbox.kill();
  //   console.log(res);
  // }, 2000);
}
