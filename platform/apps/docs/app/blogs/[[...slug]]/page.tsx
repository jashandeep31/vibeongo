import { DocsBody, DocsPage } from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import type { Metadata } from "next";
import { createRelativeLink } from "fumadocs-ui/mdx";
import {
  blogSource,
  getPageImage,
  getPageMarkdownUrl,
  source,
} from "@/lib/source";

export default async function Page(props: PageProps<"/blogs/[[...slug]]">) {
  const params = await props.params;
  if (!params.slug) notFound();

  const page = blogSource.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return blogSource.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/blogs/[[...slug]]">,
): Promise<Metadata> {
  const params = await props.params;
  if (!params.slug) notFound();

  const page = blogSource.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
