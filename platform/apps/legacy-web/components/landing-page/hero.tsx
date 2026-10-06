import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Monitor, Smartphone } from "lucide-react";
import heroImage from "@/public/assets/hero.png";

const agents = ["Codex", "OpenCode", "Pi", "T3 Code"];

export function Hero({ appLoginUrl }: { appLoginUrl: string }) {
  return (
    <section className="home-hero" aria-labelledby="home-title">
      <div className="home-container">
        <div className="home-hero-intro">
          <h1 id="home-title">
            Give your agent
            <br />a real computer.
          </h1>
          <div className="home-hero-copy">
            <p>Connect your code. Launch a workspace. Build from anywhere.</p>
            <Link href={appLoginUrl} className="home-button home-button-white">
              Launch a workspace <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a
              className="home-watch"
              href="https://x.com/Jashandeep31/status/2094763753346867608"
              target="_blank"
              rel="noopener noreferrer"
            >
              Watch the product <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
        <figure className="home-product-stage">
          <Image
            src={heroImage}
            alt="VibeOnGo projects dashboard alongside an agent conversation in the Android app"
            priority
            sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 1184px) calc(100vw - 64px), 1120px"
          />
          <figcaption className="sr-only">
            A real development environment in the cloud, controlled from the web
            or your phone.
          </figcaption>
        </figure>
        <div className="home-hero-bottom">
          <div className="home-agents" aria-label="Supported coding agents">
            {agents.map((agent) => (
              <span key={agent}>{agent}</span>
            ))}
          </div>
          <a href="#mobile" className="home-devices">
            <Monitor size={17} aria-hidden="true" />
            <Smartphone size={15} aria-hidden="true" /> Web + Android{" "}
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
