import { blogSource } from "@/lib/source";
import Link from "next/link";

function formatDate(date: unknown) {
  if (!date) return null;

  const formattedDate = new Date(String(date));
  if (Number.isNaN(formattedDate.getTime())) return null;

  return formattedDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogsPage() {
  const blogs = [...blogSource.getPages()].sort((a, b) => {
    const firstDate = a.data.date ? new Date(String(a.data.date)).getTime() : 0;
    const secondDate = b.data.date
      ? new Date(String(b.data.date)).getTime()
      : 0;

    return secondDate - firstDate;
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-fd-primary">
          From the blog
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-fd-foreground sm:text-5xl">
          Ideas, updates, and building in public
        </h1>
        <p className="mt-4 text-base leading-7 text-fd-muted-foreground sm:text-lg">
          Notes on Vibeongo, cloud development environments, and the tools that
          make working with AI agents easier.
        </p>
      </header>

      <section
        aria-label="Blog posts"
        className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {blogs.map((blog) => {
          const date = formatDate(blog.data.date);

          return (
            <Link
              key={blog.url}
              href={blog.url}
              className="group flex h-full flex-col rounded-2xl border border-fd-border bg-fd-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background"
            >
              <article className="flex h-full flex-col">
                <div className="flex items-center gap-2 text-sm text-fd-muted-foreground">
                  {date && <time dateTime={String(blog.data.date)}>{date}</time>}
                  {date && blog.data.author && <span aria-hidden="true">·</span>}
                  {blog.data.author && <span>{blog.data.author}</span>}
                </div>

                <h2 className="mt-5 text-xl font-semibold leading-snug tracking-tight text-fd-foreground transition-colors group-hover:text-fd-primary">
                  {blog.data.title}
                </h2>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-fd-muted-foreground">
                  {blog.data.description}
                </p>

                <span className="mt-auto pt-8 text-sm font-medium text-fd-primary">
                  Read article <span aria-hidden="true">→</span>
                </span>
              </article>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
