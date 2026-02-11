import { GoogleAuthCard } from "@/components/google-auth-card";

export default function page() {
  return (
    <GoogleAuthCard
      title="Create account"
      description="Sign up with your Google account."
      buttonLabel="Continue with Google"
    />
  );
}
