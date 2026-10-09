import { EmailAuthCard } from "@/components/email-auth-card";
import { isAuthenticated } from "@/lib/get-session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");
  return <EmailAuthCard />;
}
