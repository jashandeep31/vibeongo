import { cn } from "@repo/ui/lib/utils";
import React, { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer = memo(({ content }: MarkdownRendererProps) => {
  return (
    <div className="prose prose-sm dark:prose-invert text-muted-foreground max-w-none text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h1
              className={cn(
                "mt-3 scroll-m-20 text-3xl font-bold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          h2: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h2
              className={cn(
                "mt-6 scroll-m-20 border-b pb-1 text-2xl font-semibold tracking-tight first:mt-0",
                className,
              )}
              {...props}
            />
          ),
          h3: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h3
              className={cn(
                "mt-4 scroll-m-20 text-xl font-semibold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          h4: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h4
              className={cn(
                "mt-4 scroll-m-20 text-lg font-semibold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          h5: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h5
              className={cn(
                "mt-4 scroll-m-20 text-base font-semibold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          h6: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLHeadingElement>) => (
            <h6
              className={cn(
                "mt-4 scroll-m-20 text-sm font-semibold tracking-tight",
                className,
              )}
              {...props}
            />
          ),
          a: ({
            className,
            ...props
          }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
            <a
              className={cn(
                "font-medium underline underline-offset-4",
                className,
              )}
              {...props}
            />
          ),
          p: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLParagraphElement>) => (
            <p className={cn("mt-4 leading-7", className)} {...props} />
          ),
          ul: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLUListElement>) => (
            <ul className={cn("my-4 ml-5 list-disc", className)} {...props} />
          ),
          ol: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLOListElement>) => (
            <ol
              className={cn("my-4 ml-5 list-decimal", className)}
              {...props}
            />
          ),
          li: ({
            className,
            ...props
          }: React.LiHTMLAttributes<HTMLLIElement>) => (
            <li className={cn("mt-1", className)} {...props} />
          ),
          blockquote: ({
            className,
            ...props
          }: React.BlockquoteHTMLAttributes<HTMLElement>) => (
            <blockquote
              className={cn(
                "text-muted-foreground mt-4 border-l-2 pl-4 italic",
                className,
              )}
              {...props}
            />
          ),
          img: ({
            className,
            alt,
            ...props
          }: React.ImgHTMLAttributes<HTMLImageElement>) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={cn("rounded-md border", className)}
              alt={alt}
              {...props}
            />
          ),
          hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
            <hr className="my-6 md:my-8" {...props} />
          ),
          table: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLTableElement>) => (
            <div className="my-4 w-full overflow-x-auto">
              <table className={cn("w-full", className)} {...props} />
            </div>
          ),
          tr: ({
            className,
            ...props
          }: React.HTMLAttributes<HTMLTableRowElement>) => (
            <tr
              className={cn("even:bg-muted m-0 border-t p-0", className)}
              {...props}
            />
          ),
          th: ({
            className,
            ...props
          }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
            <th
              className={cn(
                "border px-3 py-1.5 text-left align-middle font-bold",
                className,
              )}
              {...props}
            />
          ),
          td: ({
            className,
            ...props
          }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
            <td
              className={cn(
                "border px-3 py-1.5 text-left align-middle",
                className,
              )}
              {...props}
            />
          ),

          code: ({ children }) => (
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
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
