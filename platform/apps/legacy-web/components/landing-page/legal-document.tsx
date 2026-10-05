import Link from "next/link";
import type { ReactNode } from "react";

export function LegalDocument({
  title,
  sections,
  children,
}: {
  title: string;
  sections: { id: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <article className="public-document">
      <header className="public-page-heading">
        <h1>{title}</h1>
      </header>
      <div className="legal-layout">
        <aside className="legal-navigation">
          <nav aria-label="On this page">
            <h2>On this page</h2>
            {sections.map(({ id, label }) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <Link href="/contact" className="legal-help">
            Have a question? Contact us →
          </Link>
        </aside>
        <div>{children}</div>
      </div>
    </article>
  );
}
