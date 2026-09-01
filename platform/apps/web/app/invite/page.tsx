import { getAppUrl } from "@/lib/app-url";
import { redirect } from "next/navigation";

export default function Page() {
  redirect(getAppUrl("/login"));
}
