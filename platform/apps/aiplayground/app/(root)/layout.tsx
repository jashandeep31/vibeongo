import { PlaygroundSidebar } from "@/components/playground-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@repo/ui/components/sidebar-v2";

export default function PlaygroundLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "22rem" } as React.CSSProperties}
    >
      <PlaygroundSidebar />
      <SidebarTrigger className="fixed top-3 left-3 z-[60] md:hidden" />
      <main className="flex min-h-svh min-w-0 w-full flex-col">{children}</main>
    </SidebarProvider>
  );
}
