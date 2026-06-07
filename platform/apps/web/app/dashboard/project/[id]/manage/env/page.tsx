import { getSession } from "@/lib/getSession";
import { redirect } from "next/navigation";
import ClientView from "./client-view";

const page = async () => {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ClientView />;
};

export default page;
