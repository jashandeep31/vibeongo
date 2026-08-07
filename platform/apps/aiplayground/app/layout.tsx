import { PwaRegistration } from "@/components/pwa-registration";
import type { Metadata, Viewport } from "next";
import "./aiplayground.css";
import Provider from "./provider";
import { Toaster } from "sonner";

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
        <PwaRegistration />
        <Toaster richColors />
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
