import { checkAdmin } from "@/lib/get-session";
import { redirect } from "next/navigation";
import React from "react";
import Provider from "../provider";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const isAdmin = await checkAdmin();
  if (!isAdmin) redirect("/not-found");
  return (
    <Provider>
      <div>{children}</div>
    </Provider>
  );
};

export default layout;
