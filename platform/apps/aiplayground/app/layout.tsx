import type { Metadata } from "next";
import "./aiplayground.css";
import Provider from "./provider";

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
      <body className="min-h-full">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
