import keytar from "keytar";

const SERVICE = "vibeongo-cli";
const ACCOUNT = "default";

export async function setKey(value: string, account = ACCOUNT): Promise<void> {
  await keytar.setPassword(SERVICE, account, value);
}

export async function getKey(account = ACCOUNT): Promise<string | null> {
  return keytar.getPassword(SERVICE, account);
}

export async function deleteKey(account = ACCOUNT): Promise<boolean> {
  return keytar.deletePassword(SERVICE, account);
}
