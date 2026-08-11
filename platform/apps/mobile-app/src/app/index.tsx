import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { apiFetch } from "@/lib/api";

type UserMetadata = {
  id: string;
  email: string;
  balance: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
};

const formatBalance = (balance: number) =>
  (balance / 10_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

export default function HomeScreen() {
  const [user, setUser] = useState<UserMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/v1/users/metadata");
      if (!response.ok)
        throw new Error(`Request failed with ${response.status}`);

      const body = (await response.json()) as { data: UserMetadata };
      setUser(body.data);
    } catch {
      setError("Could not load your account details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.brandMark}>
            <ThemedText style={styles.brandMarkText}>V</ThemedText>
          </View>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              VIBEONGO
            </ThemedText>
            <ThemedText style={styles.headerTitle}>Home</ThemedText>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color="#6d5dfc" size="large" />
            <ThemedText themeColor="textSecondary">
              Loading your account…
            </ThemedText>
          </View>
        ) : error ? (
          <View style={styles.centeredState}>
            <ThemedText style={styles.errorTitle}>
              Unable to load profile
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.errorMessage}>
              {error}
            </ThemedText>
            <Pressable onPress={loadUser} style={styles.retryButton}>
              <ThemedText style={styles.retryButtonText}>Try again</ThemedText>
            </Pressable>
          </View>
        ) : user ? (
          <View style={styles.content}>
            <View style={styles.welcomeRow}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {(
                    user.firstName?.[0] ||
                    user.username[0] ||
                    "U"
                  ).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.welcomeCopy}>
                <ThemedText type="subtitle" style={styles.welcomeTitle}>
                  Welcome back, {user.firstName || user.username}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  @{user.username}
                </ThemedText>
              </View>
            </View>

            <ThemedView type="backgroundElement" style={styles.balanceCard}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                WALLET BALANCE
              </ThemedText>
              <ThemedText style={styles.balance}>
                ${formatBalance(user.balance)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Available VibeOngo credits
              </ThemedText>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.detailsCard}>
              <Detail
                label="Name"
                value={[user.firstName, user.lastName]
                  .filter(Boolean)
                  .join(" ")}
              />
              <Detail label="Email" value={user.email} />
              <Detail label="Role" value={user.role} capitalize />
              <Detail label="User ID" value={user.id} isLast />
            </ThemedView>
          </View>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

function Detail({
  capitalize,
  isLast,
  label,
  value,
}: {
  capitalize?: boolean;
  isLast?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailBorder]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        type="smallBold"
        numberOfLines={1}
        style={[styles.detailValue, capitalize && styles.capitalize]}
      >
        {value || "—"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center" },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: Spacing.four,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6d5dfc",
  },
  brandMarkText: { color: "#ffffff", fontSize: 20, fontWeight: "900" },
  headerTitle: { fontSize: 20, lineHeight: 23, fontWeight: "800" },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  errorTitle: { fontSize: 21, fontWeight: "800" },
  errorMessage: { textAlign: "center", maxWidth: 460 },
  retryButton: {
    backgroundColor: "#6d5dfc",
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
  },
  retryButtonText: { color: "#ffffff", fontWeight: "800" },
  content: { gap: Spacing.four },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#e8e5ff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#5b4bed", fontSize: 28, fontWeight: "900" },
  welcomeCopy: { flex: 1 },
  welcomeTitle: { fontSize: 25, lineHeight: 31 },
  balanceCard: { borderRadius: 24, padding: Spacing.four, gap: Spacing.two },
  balance: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  detailsCard: { borderRadius: 24, paddingHorizontal: Spacing.four },
  detailRow: {
    minHeight: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.three,
  },
  detailBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#8e8e932e",
  },
  detailValue: { flex: 1, textAlign: "right" },
  capitalize: { textTransform: "capitalize" },
});
