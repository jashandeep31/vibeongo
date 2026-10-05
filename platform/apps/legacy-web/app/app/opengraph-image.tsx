import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt =
  "VibeOnGo mobile app: your workspace in your pocket. Android available; iOS coming soon.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const screenshot = await readFile(
    join(process.cwd(), "public/assets/app.png"),
  );
  const logo = await readFile(join(process.cwd(), "public/vibeongologo.png"));
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#eaf0fb",
        color: "#152342",
        padding: "54px 64px",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          <img
            src={`data:image/png;base64,${logo.toString("base64")}`}
            width={48}
            height={48}
            alt=""
          />
          VibeOnGo
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 44,
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-2px",
          }}
        >
          <span>Your workspace.</span>
          <span>In your pocket.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 25, color: "#52617b" }}>
          AI coding agents, wherever you are.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 38,
            alignItems: "center",
            gap: 24,
            fontSize: 22,
          }}
        >
          <span
            style={{
              background: "#1848df",
              color: "white",
              padding: "16px 24px",
              borderRadius: 8,
            }}
          >
            Download for Android
          </span>
          <span>iOS coming soon</span>
        </div>
      </div>
      <img
        src={`data:image/png;base64,${screenshot.toString("base64")}`}
        width={228}
        height={510}
        style={{ objectFit: "contain" }}
        alt="VibeOnGo Android preview"
      />
    </div>,
    size,
  );
}
