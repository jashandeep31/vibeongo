import { Command } from "commander";

export function createLoginCommand() {
  return new Command("login")
    .description("Run the sample login command (no authentication yet)")
    .action(() => {
      console.log("Login successful");
    });
}
