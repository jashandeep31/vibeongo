const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.vibeongo.com";

export function getAppUrl(path = "/") {
  return new URL(path, `${appUrl.replace(/\/$/, "")}/`).toString();
}
