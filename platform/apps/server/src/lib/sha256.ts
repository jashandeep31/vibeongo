export async function hashToSHA256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function compareSHA256andReturnString(
  str: string,
  hash: string,
): Promise<boolean> {
  const newEncodedString = await hashToSHA256(str);

  return newEncodedString === hash;
}
