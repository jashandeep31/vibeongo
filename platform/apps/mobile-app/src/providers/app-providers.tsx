import {
  ApiClientProvider,
  QueryClient,
  QueryClientProvider,
} from "@repo/api-hooks";
import { usePathname } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { createApiClient } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth";

export function AppProviders({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(true);
  const apiClient = useMemo(
    () => (isTokenLoading ? null : createApiClient(accessToken ?? "")),
    [accessToken, isTokenLoading],
  );

  useEffect(() => {
    let active = true;
    setIsTokenLoading(true);

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
    };
  }, [pathname]);

  if (!apiClient) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ApiClientProvider client={apiClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
