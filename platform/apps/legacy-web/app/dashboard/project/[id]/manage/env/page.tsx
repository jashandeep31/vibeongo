import { isAuthenticated } from "@/lib/get-session";
import { redirect } from "next/navigation";
import ClientView from "./client-view";

const page = async () => {
  const authenticated = await isAuthenticated();
  if (!authenticated) redirect("/login");
  return <ClientView />;
};

export default page;
