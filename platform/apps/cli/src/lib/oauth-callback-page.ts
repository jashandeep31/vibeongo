function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export function renderCallbackPage(status: number, message: string) {
  const success = status >= 200 && status < 300;
  const title = success ? "You're connected" : "Connection unsuccessful";
  const symbol = success
    ? '<path d="m8 12 3 3 5-6" />'
    : '<path d="m9 9 6 6m0-6-6 6" />';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${title} · Vibeongo</title>
  <style>
    :root {
      --background: oklch(0.9851 0 0);
      --foreground: #000;
      --muted: oklch(0.9700 0 0);
      --muted-foreground: oklch(0.4400 0 0);
      --primary: oklch(0.5144 0.1605 267.4400);
      --border: oklch(0.9200 0 0);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --background: #000;
        --foreground: #fff;
        --muted: oklch(0.2300 0 0);
        --muted-foreground: oklch(0.7200 0 0);
        --border: oklch(0.2600 0 0);
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: var(--background);
      color: var(--foreground);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    main {
      width: 100%;
      max-width: 320px;
      text-align: center;
    }
    .logo { display: block; width: 40px; height: 40px; margin: 0 auto 32px; border-radius: 8px; }
    h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -.5px; }
    .message { margin: 6px 0 0; color: var(--muted-foreground); font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
    .connection { display: flex; align-items: center; gap: 10px; margin-top: 32px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 8px; text-align: left; font-size: 14px; }
    .icon { width: 18px; height: 18px; flex-shrink: 0; color: ${success ? "var(--primary)" : "#ef4444"}; }
    .provider { font-weight: 500; }
    .status { margin-left: auto; border-radius: 4px; padding: 3px 7px; background: var(--muted); color: var(--muted-foreground); font-size: 11px; font-weight: 500; }
    .hint { margin: 24px 0 0; color: var(--muted-foreground); font-size: 12px; line-height: 1.7; }
  </style>
</head>
<body>
  <main aria-labelledby="result-title">
    <img class="logo" src="data:image/png;base64,${logo}" alt="VibeOnGo" width="40" height="40">
    <h1 id="result-title">${escapeHtml(title)}</h1>
    <p class="message">${escapeHtml(message)}</p>
    <div class="connection">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />${symbol}
      </svg>
      <span class="provider">ChatGPT</span>
      <span class="status">${success ? "Connected" : "Not connected"}</span>
    </div>
    <p class="hint">Return to the Vibeongo CLI.<br>You can close this window.</p>
  </main>
</body>
</html>`;
}
import { readFileSync } from "node:fs";

const logo = readFileSync(
  new URL("../../assets/vibeongo-logo.png", import.meta.url),
).toString("base64");
