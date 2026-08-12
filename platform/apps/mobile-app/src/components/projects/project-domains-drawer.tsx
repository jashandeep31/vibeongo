import {
  useGetProjectDomainsById,
  useUpdateProjectRoutingTargetInstance,
} from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function ProjectDomainsButton({
  instanceId,
  projectId,
}: {
  instanceId: string;
  projectId: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const domainsQuery = useGetProjectDomainsById(projectId, Boolean(projectId));
  const assignDomains = useUpdateProjectRoutingTargetInstance();
  const domains = domainsQuery.data;
  const needsAssignment = Boolean(
    domains && domains.target_instance_id !== instanceId,
  );

  const assign = () => {
    if (!instanceId || assignDomains.isPending) return;
    assignDomains.mutate(
      { id: projectId, instanceId },
      {
        onError: (error) =>
          Alert.alert("Could not assign domains", error.message),
      },
    );
  };

  const openDomain = (domain: string) => {
    void Linking.openURL(`https://${domain}`).catch(() =>
      Alert.alert("Could not open domain", domain),
    );
  };

  return (
    <>
      <Pressable
        accessibilityLabel="Project domains"
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.headerAction,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ ios: "globe", android: "public" }}
          size={19}
          tintColor={needsAssignment ? "#3c87f7" : theme.textSecondary}
        />
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <View style={styles.root}>
          <Pressable
            accessibilityLabel="Close project domains"
            accessibilityRole="button"
            onPress={() => setVisible(false)}
            style={styles.backdrop}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.drawer,
              {
                backgroundColor: theme.background,
                borderColor: theme.backgroundSelected,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
            <View style={styles.drawerHeader}>
              <View style={styles.drawerHeaderCopy}>
                <ThemedText style={styles.drawerTitle}>
                  Project domains
                </ThemedText>
                <ThemedText
                  style={styles.drawerSubtitle}
                  themeColor="textSecondary"
                >
                  Services routed to this project
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Reload project domains"
                accessibilityRole="button"
                disabled={domainsQuery.isFetching}
                onPress={() => void domainsQuery.refetch()}
                style={({ pressed }) => [
                  styles.drawerAction,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}
              >
                {domainsQuery.isFetching ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <SymbolView
                    name={{ ios: "arrow.clockwise", android: "refresh" }}
                    size={18}
                    tintColor={theme.textSecondary}
                  />
                )}
              </Pressable>
            </View>

            {needsAssignment ? (
              <Pressable
                accessibilityRole="button"
                disabled={assignDomains.isPending}
                onPress={assign}
                style={({ pressed }) => [
                  styles.assignButton,
                  pressed && styles.pressed,
                ]}
              >
                {assignDomains.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <ThemedText style={styles.assignText}>
                    Route domains to this session
                  </ThemedText>
                )}
              </Pressable>
            ) : null}

            <ScrollView contentContainerStyle={styles.domainList}>
              {domainsQuery.isPending ? (
                <ActivityIndicator style={styles.loading} />
              ) : domainsQuery.error ? (
                <ThemedText
                  style={styles.centerCopy}
                  themeColor="textSecondary"
                >
                  {domainsQuery.error.message}
                </ThemedText>
              ) : domains?.proxy_domains.length ? (
                domains.proxy_domains.map((domain) => (
                  <Pressable
                    accessibilityLabel={`Open ${domain.domain}`}
                    accessibilityRole="link"
                    key={domain.id}
                    onPress={() => openDomain(domain.domain)}
                    style={({ pressed }) => [
                      styles.domain,
                      { borderBottomColor: theme.backgroundSelected },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.domainCopy}>
                      <ThemedText numberOfLines={1} style={styles.domainName}>
                        {domain.domain}
                      </ThemedText>
                      <ThemedText
                        style={styles.port}
                        themeColor="textSecondary"
                      >
                        Port {domain.target_port}
                      </ThemedText>
                    </View>
                    <SymbolView
                      name={{ ios: "arrow.up.right", android: "open_in_new" }}
                      size={17}
                      tintColor={theme.textSecondary}
                    />
                  </Pressable>
                ))
              ) : (
                <ThemedText
                  style={styles.centerCopy}
                  themeColor="textSecondary"
                >
                  No project domains configured.
                </ThemedText>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  assignButton: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  assignText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  centerCopy: { paddingVertical: 32, textAlign: "center" },
  domain: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 64,
  },
  domainCopy: { flex: 1, minWidth: 0 },
  domainList: { paddingTop: 12 },
  domainName: { fontSize: 14, fontWeight: "700" },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    maxHeight: "78%",
    maxWidth: 620,
    paddingHorizontal: 20,
    position: "absolute",
    width: "100%",
  },
  drawerAction: {
    alignItems: "center",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  drawerHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  drawerHeaderCopy: { flex: 1 },
  drawerSubtitle: { fontSize: 12, lineHeight: 17 },
  drawerTitle: { fontSize: 18, fontWeight: "700" },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    marginTop: 8,
    width: 36,
  },
  headerAction: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  loading: { marginVertical: 32 },
  port: { fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.6 },
  root: { flex: 1, justifyContent: "flex-end" },
});
