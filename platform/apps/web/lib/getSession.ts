import { cookies } from "next/headers";

export const getSession = async (): Promise<null | { id: string }> => {
  try {
    const cookiesStore = await cookies();
    const session = cookiesStore.get("session");
    if (!session) {
      return null;
    }
    //TODO: fix this is sending the value
    return { id: session.value };
  } catch {
    return null;
  }
};
