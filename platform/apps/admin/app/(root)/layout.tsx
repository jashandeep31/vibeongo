import { checkAdmin } from "@/lib/get-session";
import { redirect } from "next/navigation";
import React from "react";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const isAdmin = await checkAdmin();
  if (!isAdmin) redirect("/not-found");
  return <div>{children}</div>;
};

export default layout;
