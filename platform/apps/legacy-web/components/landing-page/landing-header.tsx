"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Wordmark } from "./brand";

const navLinks = [
  { href: "#platform", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#automation", label: "Automations" },
  { href: "#forgejo", label: "Forgejo" },
  { href: "#mobile", label: "Mobile" },
  { href: "/pricing", label: "Pricing" },
];

export function LandingHeader({ appLoginUrl }: { appLoginUrl: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const destination = (href: string) =>
    href.startsWith("#") && pathname !== "/" ? `/${href}` : href;

  return (
    <header
      className="home-header"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setMenuOpen(false);
          event.currentTarget
            .querySelector<HTMLButtonElement>("button")
            ?.focus();
        }
      }}
    >
      <div className="home-container home-header-row">
        <Wordmark logoOnly />
        <nav aria-label="Main navigation" className="home-desktop-nav">
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={destination(href)}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="home-header-actions">
          <Link href={appLoginUrl} className="home-login">
            Log in
          </Link>
          <Link
            href={appLoginUrl}
            className="home-button home-button-blue home-header-cta"
            aria-label="Start building"
          >
            <span>Start building</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="home-menu-toggle"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="home-mobile-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav
          id="home-mobile-navigation"
          aria-label="Mobile navigation"
          className="home-mobile-nav"
        >
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={destination(href)}
              aria-current={pathname === href ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </a>
          ))}
          <Link href={appLoginUrl} onClick={() => setMenuOpen(false)}>
            Log in
          </Link>
        </nav>
      )}
    </header>
  );
}
