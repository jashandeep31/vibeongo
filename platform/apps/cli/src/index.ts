import { Command } from "commander";

const program = new Command();
program.name("vibeongo").version("Verion 0.0.1", "--version");
program.parse();
if (process.argv.length === 2) {
  console.log("Vibeongo CLI");
}
