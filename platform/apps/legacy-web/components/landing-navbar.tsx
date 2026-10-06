import { LandingHeader } from "./landing-page/landing-header";
import { getAppUrl } from "@/lib/app-url";

export function LandingNavbar() {
  return <LandingHeader appLoginUrl={getAppUrl("/login")} />;
}
