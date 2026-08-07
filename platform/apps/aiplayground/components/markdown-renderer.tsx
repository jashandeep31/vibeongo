import { cn } from "@repo/ui/lib/utils";
import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer = memo(({ content }: MarkdownRendererProps) => {
  return (
    <div className="prose prose-sm dark:prose-invert text-foreground max-w-none text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ className, ...props }) => (
            <h1
              className={cn(
                "mt-3 scroll-m-20 text-3xl font-bold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          h2: ({ className, ...props }) => (
            <h2
              className={cn(
                "mt-6 scroll-m-20 border-b pb-1 text-2xl font-semibold tracking-tight first:mt-0",
                className,
              )}
              {...props}
            />
          ),
          h3: ({ className, ...props }) => (
            <h3
              className={cn(
                "mt-4 scroll-m-20 text-xl font-semibold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          h4: ({ className, ...props }) => (
            <h4
              className={cn(
                "mt-4 scroll-m-20 text-lg font-semibold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          h5: ({ className, ...props }) => (
            <h5
              className={cn(
                "mt-4 scroll-m-20 text-base font-semibold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          h6: ({ className, ...props }) => (
            <h6
              className={cn(
                "mt-4 scroll-m-20 text-sm font-semibold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          a: ({ className, ...props }) => (
            <a
              className={cn(
                "font-medium underline underline-offset-4",
                className,
              )}
              {...props}
            />
          ),
          p: ({ className, ...props }) => (
            <p className={cn("mt-4 leading-7", className)} {...props} />
          ),
          ul: ({ className, ...props }) => (
            <ul className={cn("my-4 ml-5 list-disc", className)} {...props} />
          ),
          ol: ({ className, ...props }) => (
            <ol
              className={cn("my-4 ml-5 list-decimal", className)}
              {...props}
            />
          ),
          li: ({ className, ...props }) => (
            <li className={cn("mt-1", className)} {...props} />
          ),
          blockquote: ({ className, ...props }) => (
            <blockquote
              className={cn(
                "text-muted-foreground mt-4 border-l-2 pl-4 italic",
                className,
              )}
              {...props}
            />
          ),
          img: ({ className, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={cn("rounded-md border", className)}
              alt={alt}
              {...props}
            />
          ),
          hr: (props) => <hr className="my-6 md:my-8" {...props} />,
          table: ({ className, ...props }) => (
            <div className="my-4 w-full overflow-x-auto">
              <table className={cn("w-full", className)} {...props} />
            </div>
          ),
          tr: ({ className, ...props }) => (
            <tr
              className={cn("even:bg-muted m-0 border-t p-0", className)}
              {...props}
            />
          ),
          th: ({ className, ...props }) => (
            <th
              className={cn(
                "border px-3 py-1.5 text-left align-middle font-bold",
                className,
              )}
              {...props}
            />
          ),
          td: ({ className, ...props }) => (
            <td
              className={cn(
                "border px-3 py-1.5 text-left align-middle",
                className,
              )}
              {...props}
            />
          ),
          pre: ({ className, ...props }) => (
            <pre
              className={cn(
                "bg-muted text-foreground my-4 overflow-x-auto rounded-lg p-4 font-mono text-sm leading-6 whitespace-pre [&>code]:block [&>code]:rounded-none [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit",
                className,
              )}
              {...props}
            />
          ),
          code: ({ children, className, ...props }) => (
            <code
              className={cn(
                "bg-muted rounded px-1 py-0.5 font-mono text-xs",
                className,
              )}
              {...props}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = "MarkdownRenderer";

export default MarkdownRenderer;
