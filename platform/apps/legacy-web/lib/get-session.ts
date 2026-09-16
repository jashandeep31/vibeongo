import { cookies } from "next/headers";

/**
 * Just return the true or false based on the presence of the cookie.
 * Not the best apporach just for handling the client side rendering without putting load or reducing the performace
 * Back checkauthorization middleware reconfirms the authentication
 *
 * @returns boolean
 */

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
