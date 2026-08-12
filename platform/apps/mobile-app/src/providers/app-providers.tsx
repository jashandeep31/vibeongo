import {
  ApiClientProvider,
  QueryClient,
  QueryClientProvider,
} from "@repo/api-hooks";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { SignedOutScreen } from "@/components/auth/signed-out-screen";
import { ProjectStoreSync } from "@/components/projects/project-store-sync";
import { useTheme } from "@/hooks/use-theme";
import { createApiClient } from "@/lib/api-client";
import { getAccessToken, subscribeAccessToken } from "@/lib/auth";

export function AppProviders({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [queryClient] = useState(() => new QueryClient());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(true);
  const apiClient = useMemo(
    () => (isTokenLoading ? null : createApiClient(accessToken ?? "")),
    [accessToken, isTokenLoading],
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
        <ProjectStoreSync enabled={Boolean(accessToken)} />
        {children}
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
