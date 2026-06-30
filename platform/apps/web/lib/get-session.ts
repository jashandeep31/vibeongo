import { cookies } from "next/headers";

/**
 * @deprecated use getsession but don't use the id returned by it
 */
export const getSession = async (): Promise<null | { id: string }> => {
  try {
    const cookiesStore = await cookies();
    const session = cookiesStore.get("session");
    if (!session) {
      return null;
    }
    //TODO: fix we sending the session value which is in the form of jwt not a id
    //NOTE: but as we are not using this id anywhere, we can just return the session value
    return { id: session.value };
  } catch {
    return null;
  }
};
