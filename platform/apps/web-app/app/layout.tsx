import { PwaRegistration } from "@/components/pwa-registration";
import type { Metadata, Viewport } from "next";
import "./web-app.css";
import Provider from "./provider";
import { Toaster } from "sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "VibeOnGo AI Playground",
  description: "Build and iterate with AI-powered coding sessions.",
  applicationName: "VibeOnGo AI Playground",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI Playground",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        {/* eslint-disable-next-line turbo/no-undeclared-env-vars -- NODE_ENV keeps the optional scan development-only. */}
        {process.env.NODE_ENV === "development" ? (
          <Script
            src="https://unpkg.com/react-scan/dist/auto.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        ) : null}
        <PwaRegistration />
        <Toaster richColors />
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
