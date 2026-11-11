import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import heroImage from "@/public/assets/hero.png";

export function Hero({ appLoginUrl }: { appLoginUrl: string }) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-container">
        <div className="home-hero-intro">
          <div className="home-hero-heading">
            <p className="home-hero-eyebrow">Cloud workspaces. Web & Android.</p>
            <h1 id="home-title">
              Your workspace.
              <br />
              <span>Beyond your desk.</span>
            </h1>
          </div>
          <div className="home-hero-copy">
            <p>
              A real computer for your code and your agents. Connect a repository,
              start building, and pick up where you left off on your phone.
            </p>
            <div className="home-hero-actions">
              <Link href={appLoginUrl} className="home-button home-hero-primary">
                Start building <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a
                className="home-watch"
                href="https://x.com/Jashandeep31/status/2094763753346867608"
                target="_blank"
                rel="noopener noreferrer"
              >
                See it in action <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <figure className="home-product-stage">
          <Image
            src={heroImage}
            alt="VibeOnGo projects dashboard alongside an agent conversation in the Android app"
            priority
            sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 1180px) calc(100vw - 64px), 1120px"
          />
        </figure>
      </div>
    </section>
  );
}
