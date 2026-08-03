import type { Metadata } from "next";
import "./aiplayground.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
