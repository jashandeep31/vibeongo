import { getSession } from "@/lib/get-session";
import ClientView from "./client-view";
import { redirect } from "next/navigation";

const page = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return (
    <div>
      <ClientView />
    </div>
  );
};

export default page;
