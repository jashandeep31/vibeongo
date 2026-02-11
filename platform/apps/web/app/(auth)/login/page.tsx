import { GoogleAuthCard } from "@/components/google-auth-card";

export default function page() {
  return (
    <GoogleAuthCard
      title="Welcome back"
      description="Sign in with your Google account."
      buttonLabel="Continue with Google"
    />
  );
}
