import { getSession } from "@/lib/getSession";
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
