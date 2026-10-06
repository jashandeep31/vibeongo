import React from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Mail, Twitter, Github, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Get in touch with the VibeOnGo team by email, on X or on GitHub — questions, feedback, bug reports and partnership requests welcome.",
  path: "/contact",
});

export default function ContactPage() {
  const contactMethods = [
    {
      name: "Email",
      value: "hi@jashan.dev",
      href: "mailto:hi@jashan.dev",
      icon: Mail,
      label: "Send an email",
    },
    {
      name: "Twitter",
      value: "@Jashandeep31",
      href: "https://x.com/Jashandeep31",
      icon: Twitter,
      label: "Follow on X",
    },
    {
      name: "GitHub",
      value: "jashandeep31",
      href: "https://github.com/jashandeep31",
      icon: Github,
      label: "Check out projects",
    },
  ];

  return (
    <article className="public-contact">
      <header className="public-page-heading">
        <h1>Get in touch</h1>
        <p>
          Have questions, feedback, or need support? Reach out through any of
          the channels below.
        </p>
      </header>
      <div className="contact-list">
        {contactMethods.map((method) => (
          <section key={method.name} className="contact-method">
            <method.icon size={24} aria-hidden="true" />
            <div>
              <h2>{method.name}</h2>
              <p>{method.value}</p>
            </div>
            <Link
              href={method.href}
              target={method.href.startsWith("https:") ? "_blank" : undefined}
              rel={
                method.href.startsWith("https:")
                  ? "noopener noreferrer"
                  : undefined
              }
            >
              {method.label}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </section>
        ))}
      </div>
    </article>
  );
}
