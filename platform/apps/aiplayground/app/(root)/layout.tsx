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
    <SidebarProvider>
      <PlaygroundSidebar />
      <SidebarTrigger className="fixed top-3 left-3 z-[60] md:hidden" />
      <main className="flex min-h-svh w-full flex-col">
        <div className="flex flex-1 items-center justify-center p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
