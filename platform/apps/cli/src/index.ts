import { Command, InvalidArgumentError } from "commander";
import { login } from "./commands/login.js";
import { logout } from "./commands/logout.js";
import { projects } from "./commands/projects.js";
import { wallet } from "./commands/wallet.js";
import { runCommand } from "./lib/run-command.js";
import { startMcpServer } from "./mcp.js";

const program = new Command();
program.name("vibeongo").version("Verion 0.0.1", "--version");

function positiveInteger(value: string, max?: number): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || (max && number > max)) {
    throw new InvalidArgumentError(
      max ? `Enter an integer from 1 to ${max}.` : "Enter a positive integer.",
    );
  }
  return number;
}
program
  .command("login")
  .description("Log in to Vibeongo with an API key")
  .action(runCommand(login));
program
  .command("logout")
  .description("Log out on this device")
  .action(runCommand(logout));
program
  .command("wallet")
  .description("Show your wallet balance")
  .action(runCommand(wallet));
program
  .command("projects")
  .description("List projects with active sessions and running instances")
  .option("--page <number>", "Project page", (value) => positiveInteger(value))
  .option("--limit <number>", "Projects per page (max 20)", (value) =>
    positiveInteger(value, 20),
  )
  .action(runCommand(projects));
program
  .command("mcp")
  .description("Start the Vibeongo MCP server over stdio")
  .action(startMcpServer);
await program.parseAsync();
if (process.argv.length === 2) {
  console.log("Vibeongo CLI");
}
