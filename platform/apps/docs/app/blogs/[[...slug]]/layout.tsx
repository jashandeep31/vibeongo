import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout sidebar={{ enabled: false }} tree={source.getPageTree()}>
      {children}
    </DocsLayout>
  );
}
