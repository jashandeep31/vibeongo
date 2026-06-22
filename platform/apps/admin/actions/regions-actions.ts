"use server";

import { checkAdmin } from "@/lib/get-session";
import { db, eq, instanceRegions } from "@repo/db";
import { revalidatePath } from "next/cache";

export const updateRegionAmi = async (rId: string, ami: string) => {
  await checkAdmin();

  const nextAmi = ami.trim();

  if (!rId) {
    throw new Error("region id is required");
  }

  if (!nextAmi) {
    throw new Error("AMI is required");
  }

  await db
    .update(instanceRegions)
    .set({
      ami: nextAmi,
      updated_at: new Date(),
    })
    .where(eq(instanceRegions.id, rId));

  revalidatePath("/regions");

  return true;
};
