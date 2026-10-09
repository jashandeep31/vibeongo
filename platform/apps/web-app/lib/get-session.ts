import { cookies } from "next/headers";
import { BACKEND_URL } from "./constants";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();

  const token = cookieStore.get("session")?.value;
  if (!token) return false;
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/users/me`, {
      headers: { Cookie: `session=${encodeURIComponent(token)}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
