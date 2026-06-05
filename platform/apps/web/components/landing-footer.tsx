import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
              VibeOnGo
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Experience a full-fledged development environment right in your browser. Any device, anywhere, anytime.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Resources</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link 
                  href="https://github.com/jashandeep31/vibeongo" 
                  className="hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-white/5 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} VibeOnGo. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
