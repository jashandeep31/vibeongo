import { getSession } from "@/lib/getSession";
import { redirect } from "next/navigation";
import ClientView from "./client-view";

const page = () => {
  const session = getSession();
  if (!session) redirect("/login");
  return <ClientView />;
};

export default page;
