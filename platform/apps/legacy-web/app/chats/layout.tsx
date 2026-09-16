import { ChatsSidebar } from "@/components/chats-sidebar";
import ProjectsNavbar from "@/components/projects-navbar";
import { VibeSocketProvider } from "@/hooks/use-vibe-socket";
import { SidebarProvider } from "@repo/ui/components/sidebar";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <SidebarProvider>
        <ChatsSidebar />
        <ProjectsNavbar />
        <VibeSocketProvider>
          <main className="grid h-dvh min-h-0 w-full grid-rows-[minmax(0,1fr)] overflow-hidden pt-[56px] md:mt-0 md:pt-0">
            {children}
          </main>
        </VibeSocketProvider>
      </SidebarProvider>
    </div>
  );
};

export default layout;
