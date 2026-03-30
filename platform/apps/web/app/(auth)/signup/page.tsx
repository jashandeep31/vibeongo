import { GithubAuthCard } from "@/components/github-auth-card";

export default function page() {
  return (
    <GithubAuthCard
      title="Create account"
      description="Sign up with your GitHub account."
      buttonLabel="Continue with GitHub"
    />
  );
}
