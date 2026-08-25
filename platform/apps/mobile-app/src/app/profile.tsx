import { useUserMetadata } from "@repo/api-hooks";
import { formatInternalMoney } from "@repo/shared/money";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { useTheme } from "@/hooks/use-theme";
import { clearAccessToken } from "@/lib/auth";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const userQuery = useUserMetadata();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const user = userQuery.data;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const displayName = fullName || user?.username || "Your profile";

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      router.replace("/");
      await clearAccessToken();
    } catch {
      setIsSigningOut(false);
      Alert.alert("Could not sign out", "Please try again.");
    }
  };

  const requestSignOut = () => {
    Alert.alert(
      "Sign out?",
      "You will need to sign in again to use VibeOnGo.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => void signOut(),
        },
      ],
    );
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout
        top={
          <PageHeader
            onBack={() => router.back()}
            title="Profile"
            titleOpacity={titleOpacity}
          />
        }
      >
        {({ topInset }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: topInset }]}
            onScroll={onTitleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {userQuery.isPending ? (
              <View style={styles.state}>
                <ActivityIndicator color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary">
                  Loading profile...
                </ThemedText>
              </View>
            ) : userQuery.isError || !user ? (
              <View style={styles.state}>
                <SymbolView
                  name={{
                    ios: "exclamationmark.circle",
                    android: "error_outline",
                  }}
                  size={28}
                  tintColor={theme.textSecondary}
                />
                <ThemedText style={styles.stateTitle}>
                  Could not load profile
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void userQuery.refetch()}
                  style={({ pressed }) => [
                    styles.retryButton,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.retryLabel}>Try again</ThemedText>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.identity}>
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <SymbolView
                      name={{ ios: "person.fill", android: "person" }}
                      size={36}
                      tintColor={theme.textSecondary}
                    />
                    <Image
                      accessibilityLabel={`${displayName} profile picture`}
                      contentFit="cover"
                      source={`https://github.com/${user.username}.png`}
                      style={styles.avatarImage}
                      transition={120}
                    />
                  </View>
                  <ThemedText numberOfLines={2} style={styles.name}>
                    {displayName}
                  </ThemedText>
                  <ThemedText
                    style={styles.username}
                    themeColor="textSecondary"
                  >
                    @{user.username}
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.details,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                >
                  <ProfileField label="Username" value={`@${user.username}`} />
                  <ProfileField
                    label="Balance"
                    value={`$${formatInternalMoney(user.balance)}`}
                  />
                </View>
              </>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSigningOut }}
              disabled={isSigningOut}
              onPress={requestSignOut}
              style={({ pressed }) => [
                styles.signOut,
                { borderColor: theme.backgroundSelected },
                (pressed || isSigningOut) && styles.pressed,
              ]}
            >
              {isSigningOut ? (
                <ActivityIndicator color="#ef4444" size="small" />
              ) : (
                <SymbolView
                  name={{
                    ios: "rectangle.portrait.and.arrow.right",
                    android: "logout",
                  }}
                  size={20}
                  tintColor="#ef4444"
                />
              )}
              <ThemedText style={styles.signOutLabel}>Sign out</ThemedText>
            </Pressable>
          </ScrollView>
        )}
      </PageChromeLayout>
    </SafeAreaView>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText selectable style={styles.fieldValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 58,
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  content: {
    flexGrow: 1,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  identity: {
    alignItems: "center",
    paddingBottom: 30,
    paddingTop: 36,
  },
  avatar: {
    alignItems: "center",
    borderRadius: 46,
    height: 92,
    justifyContent: "center",
    marginBottom: 18,
    overflow: "hidden",
    width: 92,
  },
  avatarImage: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  name: {
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 31,
    textAlign: "center",
  },
  username: {
    fontSize: 15,
    marginTop: 3,
  },
  details: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  field: {
    gap: 4,
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fieldLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  fieldValue: {
    fontSize: 15,
    lineHeight: 21,
  },
  signOut: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: "auto",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  signOutLabel: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
  },
  state: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    minHeight: 360,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    borderRadius: 10,
    marginTop: 2,
    minHeight: 42,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.68,
  },
});
