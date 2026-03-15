import { z } from "@repo/shared";
import { cookies } from "next/headers";

const cookiesSchema = z.object({
  id: z.string(),
});

export const getSession = async (): Promise<null | { id: string }> => {
  try {
    const cookiesStore = await cookies();
    const session = cookiesStore.get("session");
    if (!session) {
      return null;
    }
    const sessionData = cookiesSchema.parse(JSON.parse(session.value));
    return sessionData;
  } catch {
    return null;
  }
};
