import keytar from "keytar";
import { Effect } from "effect";
import { CliError } from "./cli-error.js";

const SERVICE = "vibeongo-cli";
const ACCOUNT = "default";

export function setKey(value: string, account = ACCOUNT) {
  return Effect.tryPromise({
    try: () => keytar.setPassword(SERVICE, account, value),
    catch: () =>
      new CliError("The API key was verified, but could not be saved to the system keychain."),
  });
}

export function getKey(account = ACCOUNT) {
  return Effect.tryPromise({
    try: () => keytar.getPassword(SERVICE, account),
    catch: () => new CliError("Could not read the system keychain."),
  });
}

export function deleteKey(account = ACCOUNT) {
  return Effect.tryPromise({
    try: () => keytar.deletePassword(SERVICE, account),
    catch: () =>
      new CliError("Could not remove the API key from the system keychain."),
  });
}
