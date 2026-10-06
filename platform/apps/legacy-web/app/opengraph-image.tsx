import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "VibeOnGo — Give your agent a real computer. Cloud workspaces for AI coding agents.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/vibeongologo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f7f6f2",
          color: "#17181c",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={logoSrc} width={56} height={56} style={{ borderRadius: 14 }} alt="" />
          <span style={{ fontSize: 34, fontWeight: 600 }}>VibeOnGo</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 0.98, letterSpacing: -4 }}>
            Give your agent
          </div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 0.98, letterSpacing: -4 }}>
            <span>a&nbsp;</span>
            <span style={{ position: "relative", display: "flex" }}>
              real computer
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 4,
                  bottom: -8,
                  height: 9,
                  borderRadius: 9,
                  background: "#5b5cf0",
                }}
              />
            </span>
            {/* Letter-spacing does not carry across spans; close the gap by hand. */}
            <span style={{ marginLeft: -10 }}>.</span>
          </div>
          <div style={{ marginTop: 36, fontSize: 30, color: "rgba(23,24,28,0.55)" }}>
            Cloud workspaces for AI coding agents — from the web or your phone.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {["Codex", "OpenCode", "Pi", "T3 Code", "Android app"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                background: label === "Android app" ? "#5b5cf0" : "#17181c",
                color: "#fff",
                fontSize: 24,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
