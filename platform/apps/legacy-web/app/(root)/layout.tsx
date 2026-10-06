import React from "react";
import { LandingHeader } from "@/components/landing-page/landing-header";
import { LandingFooter } from "@/components/landing-page/landing-footer";
import { getAppUrl } from "@/lib/app-url";
import "../home.css";
import "./public-pages.css";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="home-page marketing-root flex min-h-screen flex-col">
      <a href="#public-content" className="home-skip-link">
        Skip to content
      </a>
      <LandingHeader appLoginUrl={getAppUrl("/login")} />
      <main id="public-content" className="flex-1">
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}
