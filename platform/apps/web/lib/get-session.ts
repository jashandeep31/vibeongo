import { cookies } from "next/headers";

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const cookiesStore = await cookies();
    const session = cookiesStore.get("session");
    if (!session) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
