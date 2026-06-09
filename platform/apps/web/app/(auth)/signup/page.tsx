import { GithubAuthCard } from "@/components/github-auth-card";

export default function page() {
  return (
    <GithubAuthCard
      title="Public access is coming soon"
      description="VibeOnGo is currently in private preview while we prepare the platform for everyone. Existing early-access users can continue with GitHub."
      buttonLabel="Continue with GitHub"
    />
  );
}
