import { Command } from "commander";
import { login } from "./commands/login.js";
import { logout } from "./commands/logout.js";
import { wallet } from "./commands/wallet.js";
import { withAuthenticatedClient } from "./lib/with-authenticated-client.js";

const program = new Command();
program.name("vibeongo").version("Verion 0.0.1", "--version");
program
  .command("login")
  .description("Log in to Vibeongo with an API key")
  .action(login);
program.command("logout").description("Log out on this device").action(logout);
program
  .command("wallet")
  .description("Show your wallet balance")
  .action(withAuthenticatedClient(wallet));
program.parse();
if (process.argv.length === 2) {
  console.log("Vibeongo CLI");
}
