import { isAuthenticated } from "@/lib/get-session";
import ClientView from "./client-view";
import { redirect } from "next/navigation";

const page = async () => {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/login");
  }
  return (
    <div>
      <ClientView />
    </div>
  );
};

export default page;
