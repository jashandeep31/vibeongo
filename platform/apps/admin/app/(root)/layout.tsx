import { checkAdmin } from "@/lib/get-session";
import AdminNavbar from "@/components/admin-navbar";
import { redirect } from "next/navigation";
import React from "react";
import Provider from "../provider";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const isAdmin = await checkAdmin();
  if (!isAdmin) redirect("/not-found");
  return (
    <Provider>
      <AdminNavbar />
      <main className="bg-background min-h-screen flex-1 p-4 text-foreground sm:p-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
      </main>
    </Provider>
  );
};

export default layout;
