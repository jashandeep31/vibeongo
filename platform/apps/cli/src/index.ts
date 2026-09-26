import { Command } from "commander";
import { login } from "./commands/login.js";
import { logout } from "./commands/logout.js";
import { wallet } from "./commands/wallet.js";
import { runCommand } from "./lib/run-command.js";
import { startMcpServer } from "./mcp.js";

const program = new Command();
program.name("vibeongo").version("Verion 0.0.1", "--version");
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
  .command("mcp")
  .description("Start the Vibeongo MCP server over stdio")
  .action(startMcpServer);
await program.parseAsync();
if (process.argv.length === 2) {
  console.log("Vibeongo CLI");
}
