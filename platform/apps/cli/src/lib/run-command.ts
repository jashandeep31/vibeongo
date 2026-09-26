import { Effect } from "effect";
import { CliError } from "./cli-error.js";

export function runCommand<Args extends unknown[]>(
  action: (...args: Args) => Effect.Effect<void, CliError>,
): (...args: Args) => Promise<void> {
  return (...args: Args) =>
    Effect.runPromise(
      action(...args).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            console.error(error.message);
            process.exitCode = 1;
          }),
        ),
      ),
    ).catch(() => {
      console.error("Command failed unexpectedly.");
      process.exitCode = 1;
    });
}
