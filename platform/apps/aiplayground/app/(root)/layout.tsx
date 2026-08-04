import { PlaygroundSidebar } from "@/components/playground-sidebar";
import { PlaygroundStoreSync } from "@/components/playground-store-sync";
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
      <PlaygroundStoreSync />
      <PlaygroundSidebar />
      <SidebarTrigger className="fixed top-3 left-3 z-[60] md:hidden" />
      <main className="flex min-h-svh w-full min-w-0 flex-col">{children}</main>
    </SidebarProvider>
  );
}
