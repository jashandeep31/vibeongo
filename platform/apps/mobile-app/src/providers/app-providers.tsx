import {
  ApiClientProvider,
  QueryClient,
  QueryClientProvider,
  WebSocketProvider,
} from "@repo/api-hooks";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { SignedOutScreen } from "@/components/auth/signed-out-screen";
import { ProjectStoreSync } from "@/components/projects/project-store-sync";
import { useTheme } from "@/hooks/use-theme";
import { createApiClient } from "@/lib/api-client";
import { getAccessToken, subscribeAccessToken } from "@/lib/auth";

type ReactNativeWebSocketConstructor = new (
  url: string,
  protocols?: string[],
  options?: { headers?: Record<string, string> },
) => WebSocket;

export function AppProviders({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [queryClient] = useState(() => new QueryClient());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(true);
  const apiClient = useMemo(
    () => (isTokenLoading ? null : createApiClient(accessToken ?? "")),
    [accessToken, isTokenLoading],
  );

  // Creating the socket vibeongo app  related opreations
  const createAuthenticatedSocket = useCallback(
    (url: string) => {
      const NativeWebSocket =
        WebSocket as unknown as ReactNativeWebSocketConstructor;

      return new NativeWebSocket(url, [], {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    [accessToken],
  );

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAccessToken((token) => {
      queryClient.clear();
      setAccessToken(token);
    });

    void getAccessToken()
      .then((token) => {
        if (active) setAccessToken(token);
      })
      .catch(() => {
        if (active) setAccessToken(null);
      })
      .finally(() => {
        if (active) setIsTokenLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  if (!apiClient) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!accessToken) return <SignedOutScreen />;

  return (
    <ApiClientProvider client={apiClient}>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider createSocket={createAuthenticatedSocket}>
          <ProjectStoreSync enabled={Boolean(accessToken)} />
          {children}
        </WebSocketProvider>
      </QueryClientProvider>
    </ApiClientProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
