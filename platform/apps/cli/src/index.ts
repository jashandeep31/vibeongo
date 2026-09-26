import { Command } from "commander";
import { login } from "./commands/login.js";

const program = new Command();
program.name("vibeongo").version("Verion 0.0.1", "--version");
program.command("login").description("Log in to Vibeongo").action(login);
program.parse();
if (process.argv.length === 2) {
  console.log("Vibeongo CLI");
}
