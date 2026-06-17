import { GithubAuthCard } from "@/components/github-auth-card";

export default function page() {
  return (
    <GithubAuthCard
      title="VibeOnGo signup is invite-only"
      description="Join the waitlist and we will let you know when access is available. Existing invited users can continue with GitHub."
      buttonLabel="Continue with GitHub"
    />
  );
}
