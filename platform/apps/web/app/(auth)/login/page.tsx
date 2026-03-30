import { GithubAuthCard } from "@/components/github-auth-card";

export default function page() {
  return (
    <GithubAuthCard
      title="Welcome back"
      description="Sign in with your GitHub account."
      buttonLabel="Continue with GitHub"
    />
  );
}
