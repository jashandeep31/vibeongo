#!/usr/bin/env node

import { createCli } from "./cli.js";

try {
  const program = createCli();
  if (process.argv.length === 2) {
    program.outputHelp();
  } else {
    await program.parseAsync(process.argv);
  }
} catch (error) {
  if (error instanceof Error && error.name === "ExitPromptError") {
    console.error("Login cancelled.");
    process.exitCode = 130;
  } else {
    console.error(
      error instanceof Error ? error.message : "CLI command failed",
    );
    process.exitCode = 1;
  }
}
