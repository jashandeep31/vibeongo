import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar";
import { Server } from "lucide-react";
import Link from "next/link";

// Mock data representing connected servers (projects)
const demoProjects = [
  {
    id: "proj-1",
    name: "Mail studio",
  },
  {
    id: "proj-2",
    name: "Postly",
  },
  {
    id: "proj-3",
    name: "Old Prototype",
  },
] as const;

export function ServerSidebar() {
  return (
    <Sidebar className="">
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel>Connected Servers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {demoProjects.map((server) => (
                <SidebarMenuItem key={server.id}>
                  <SidebarMenuButton
                    asChild
                    className="active:bg-background data-active:bg-background cursor-pointer"
                  >
                    <Link href={`/projects/${server.id}`}>
                      <Server className="h-4 w-4" />
                      <span>{server.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
