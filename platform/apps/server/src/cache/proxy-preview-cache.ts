import { redis } from "../lib/valkey.js";

// Daytona URLs last 60 minutes; expire cached previews 10 minutes earlier.
const PREVIEW_CACHE_TTL_SECONDS = 60 * 50;

type PreviewProvider = "daytona" | "e2b" | "boat";

export type CachedProxyPreview = { url: string; token: string };

const previewKey = (
  provider: PreviewProvider,
  sandboxId: string,
  port: number,
) => `proxy:preview:v1:${provider}:${encodeURIComponent(sandboxId)}:${port}`;

export async function getCachedProxyPreview(
  provider: PreviewProvider,
  sandboxId: string,
  port: number,
): Promise<CachedProxyPreview | undefined> {
  try {
    const cached = await redis.get(previewKey(provider, sandboxId, port));
    if (!cached) return;

    const preview: unknown = JSON.parse(cached);
    if (
      typeof preview === "object" &&
      preview !== null &&
      "url" in preview &&
      typeof preview.url === "string" &&
      preview.url.length > 0 &&
      "token" in preview &&
      typeof preview.token === "string" &&
      preview.token.length > 0
    ) {
      return { url: preview.url, token: preview.token };
    }
  } catch {
    console.error("Failed to read cached proxy preview");
  }
}

export async function cacheProxyPreview(
  provider: PreviewProvider,
  sandboxId: string,
  port: number,
  preview: CachedProxyPreview,
): Promise<void> {
  try {
    await redis.set(
      previewKey(provider, sandboxId, port),
      JSON.stringify(preview),
      "EX",
      PREVIEW_CACHE_TTL_SECONDS,
    );
  } catch {
    console.error("Failed to cache proxy preview");
  }
}

export async function invalidateCachedProxyPreviews(
  provider: PreviewProvider,
  sandboxId: string,
): Promise<void> {
  const prefix = `proxy:preview:v1:${provider}:${encodeURIComponent(sandboxId)}:`;
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      `${prefix}*`,
      "COUNT",
      100,
    );
    cursor = nextCursor;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== "0");
}
