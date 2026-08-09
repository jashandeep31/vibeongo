import { MobileSidebarTrigger } from "@/components/mobile-sidebar-trigger";
import { PlaygroundCommandBox } from "@/components/playground-command-box";
import { PlaygroundSidebar } from "@/components/playground-sidebar";
import { PlaygroundStoreSync } from "@/components/playground-store-sync";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { isAuthenticated } from "@/lib/get-session";
import { SidebarProvider } from "@repo/ui/components/sidebar-v2";
import { redirect } from "next/navigation";

export default async function PlaygroundLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/login");
  }

  return (
    <WebSocketProvider>
      <SidebarProvider
        style={{ "--sidebar-width": "22rem" } as React.CSSProperties}
      >
        <PlaygroundStoreSync />
        <PlaygroundCommandBox />
        <PlaygroundSidebar />
        <MobileSidebarTrigger className="bg-background/90 border shadow-sm backdrop-blur" />
        <main className="flex min-h-svh w-full min-w-0 flex-col">
          {children}
        </main>
      </SidebarProvider>
    </WebSocketProvider>
  );
}
