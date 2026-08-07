import type { Metadata } from "next";
import "./aiplayground.css";
import Provider from "./provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "AI Playground",
  description: "AI Playground",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <Toaster richColors />
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
