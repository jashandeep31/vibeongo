import { readFileSync } from "node:fs";
import { Command } from "commander";
import { createLoginCommand } from "./commands/login.js";

export function createCli() {
  const { version } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version: string };

  const program = new Command()
    .name("vibeongo")
    .description("Command-line tools for Vibeongo")
    .version(version, "-v, --version")
    .helpCommand(true)
    .showHelpAfterError();

  program
    .command("version")
    .description("Show the CLI version")
    .action(() => {
      console.log(version);
    });

  program.addCommand(createLoginCommand());

  return program;
}
