import type { Metadata } from "next";
import "./globals.css";
import "@repo/ui/globals.css";
import Provider from "./provider";
import { Toaster } from "sonner";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import { cn } from "@repo/ui/lib/utils";
import { Analytics } from "@vercel/analytics/next";

const instrumentSansHeading = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "VibeOnGo",
  description: "Run and manage your development environments from anywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        instrumentSansHeading.variable,
        "dark",
      )}
      suppressHydrationWarning
    >
      <body>
        <Toaster richColors />
        <Provider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </Provider>
        <Analytics />
      </body>
    </html>
  );
}
