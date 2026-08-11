import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { API_URL, apiFetch } from "@/lib/api";
import {
  getStoredToken,
  removeStoredToken,
  storeToken,
} from "@/lib/token-storage";

type AuthContextValue = {
  error: string | null;
  isLoading: boolean;
  isSigningIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  token: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const getAuthError = (error: string | string[] | undefined) => {
  if (error === "invite_required")
    return "Your account still needs an invite before you can sign in.";
  if (error === "account_inactive")
    return "This account is currently inactive.";
  return "GitHub sign-in could not be completed. Please try again.";
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (__DEV__) {
      setToken("development-session");
      setIsLoading(false);
      return;
    }

    const restoreSession = async () => {
      const storedToken = await getStoredToken();
      if (!storedToken) return;

      try {
        const response = await apiFetch(
          "/api/v1/auth/session",
          {},
          storedToken,
        );
        if (response.status === 401) {
          await removeStoredToken();
          return;
        }
      } catch {
        // Keep a previously valid session available while the device is offline.
      }

      setToken(storedToken);
    };

    restoreSession().finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    setIsSigningIn(true);

    try {
      const redirectUri = Linking.createURL("auth/callback");
      const authUrl = new URL(`${API_URL}/api/v1/auth/github`);
      authUrl.searchParams.set("client", "mobile");
      authUrl.searchParams.set("redirect_uri", redirectUri);

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl.toString(),
        redirectUri,
      );
      if (result.type !== "success") return;

      const { queryParams } = Linking.parse(result.url);
      const returnedToken = queryParams?.token;
      if (typeof returnedToken !== "string" || !returnedToken) {
        setError(getAuthError(queryParams?.error));
        return;
      }

      await storeToken(returnedToken);
      setToken(returnedToken);
    } catch {
      setError(
        "Unable to open GitHub sign-in. Check your connection and try again.",
      );
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await removeStoredToken();
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ error, isLoading, isSigningIn, signIn, signOut, token }),
    [error, isLoading, isSigningIn, signIn, signOut, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
