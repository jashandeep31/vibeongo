import { PlaygroundSidebar } from "@/components/playground-sidebar";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@repo/ui/components/sidebar";

export default function PlaygroundLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <PlaygroundSidebar />
      <main className="flex min-h-svh w-full flex-col">
        <header className="flex h-14 items-center border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
