import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";

export default function Layout({ children }: LayoutProps<"/blogs/[...slug]">) {
  return (
    <DocsLayout sidebar={{ enabled: false }} tree={source.getPageTree()}>
      {children}
    </DocsLayout>
  );
}
