import { ChatsSidebar } from "@/components/chats-sidebar";
import { VibeSocketProvider } from "@/hooks/use-vibe-socket";
import { SidebarProvider } from "@repo/ui/components/sidebar";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <SidebarProvider>
        <ChatsSidebar />
        <VibeSocketProvider>
          <main className="grid w-full">{children}</main>
        </VibeSocketProvider>
      </SidebarProvider>
    </div>
  );
};

export default layout;
