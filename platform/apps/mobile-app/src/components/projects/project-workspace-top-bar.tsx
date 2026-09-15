import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { memo, type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { PageHeader } from "@/components/page-chrome";
import { InstanceExpiryCountdown } from "@/components/projects/instance-expiry-countdown";
import { ProjectDomainsButton } from "@/components/projects/project-domains-drawer";
import { ProjectFilesButton } from "@/components/projects/project-files-button";
import { ProjectMcpButton } from "@/components/projects/project-mcp-button";
import {
  ProjectMcpDrawer,
  type OpencodeWorkspaceConnection,
} from "@/components/projects/project-mcp-drawer";
import { ProjectSettingsButton } from "@/components/projects/project-settings-button";
import { ProjectWorkspaceActionsDrawer } from "@/components/projects/project-workspace-actions-drawer";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export const ProjectWorkspaceTopBar = memo(function ProjectWorkspaceTopBar({
  active = "chat",
  changeCount = 0,
  connection,
  instanceId,
  isExpiring = false,
  isRefreshing = false,
  onBack,
  onOpenSwitcher,
  onRefresh,
  opencodeSessionId,
  opencodePassword,
  projectId,
  projectSessionId,
  showReview = true,
  terminatesAt,
  title,
  titleTrailing,
}: {
  active?: "chat" | "review";
  changeCount?: number;
  connection?: OpencodeWorkspaceConnection;
  instanceId: string;
  isExpiring?: boolean;
  isRefreshing?: boolean;
  onBack: () => void;
  onOpenSwitcher?: () => void;
  onRefresh: () => void;
  opencodeSessionId?: string;
  opencodePassword?: string;
  projectId: string;
  projectSessionId: string;
  showReview?: boolean;
  terminatesAt?: Date | number | string | null;
  title: string;
  titleTrailing?: ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [actionsVisible, setActionsVisible] = useState(false);
  const [mcpVisible, setMcpVisible] = useState(false);

  const openReview = () => {
    if (!opencodeSessionId) return;
    router.push({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/review",
      params: {
        chatId: opencodeSessionId,
        projectId,
        projectSessionId,
      },
    });
  };
  const openFiles = () =>
    router.push({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/files",
      params: { projectId, projectSessionId },
    });
  const openSettings = () =>
    router.push({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/settings",
      params: { projectId, projectSessionId },
    });
  const domainsAction = (
    <ProjectDomainsButton
      compact={!wide}
      instanceId={instanceId}
      opencodePassword={opencodePassword}
      projectId={projectId}
    />
  );

  const reviewButton = (
    <Pressable
      accessibilityLabel="Review changes"
      accessibilityRole="button"
      accessibilityState={{
        disabled: !opencodeSessionId,
        selected: active === "review",
      }}
      disabled={!opencodeSessionId || active === "review"}
      hitSlop={!wide ? 3 : undefined}
      onPress={openReview}
      style={({ pressed }) => [
        styles.action,
        !wide && styles.compactAction,
        active === "review" && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: "arrow.left.arrow.right", android: "difference" }}
        size={19}
        tintColor={theme.textSecondary}
      />
      {changeCount > 0 ? (
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>
            {changeCount > 99 ? "99+" : changeCount}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <>
      <PageHeader
        accessibilityLabel="Switch chat"
        onBack={onBack}
        onTitlePress={onOpenSwitcher}
        right={
          <View
            style={[
              styles.actions,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            {showReview ? reviewButton : null}
            {!wide ? domainsAction : null}
            {wide ? (
              <>
                <ProjectFilesButton
                  projectId={projectId}
                  projectSessionId={projectSessionId}
                />
                <ProjectSettingsButton
                  projectId={projectId}
                  projectSessionId={projectSessionId}
                />
                <ProjectMcpButton
                  disabled={!connection}
                  onPress={() => setMcpVisible(true)}
                />
                {domainsAction}
                <RefreshButton
                  isRefreshing={isRefreshing}
                  onRefresh={onRefresh}
                />
              </>
            ) : (
              <Pressable
                accessibilityLabel="More workspace actions"
                accessibilityRole="button"
                hitSlop={3}
                onPress={() => setActionsVisible(true)}
                style={({ pressed }) => [
                  styles.action,
                  styles.compactAction,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "ellipsis", android: "more_horiz" }}
                  size={20}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            )}
          </View>
        }
        title={title}
        titleContainerStyle={isExpiring ? styles.expiringTitle : undefined}
        titleLeading={
          isExpiring ? (
            <SymbolView
              name={{ ios: "clock.fill", android: "schedule" }}
              size={13}
              tintColor="#f59e0b"
            />
          ) : undefined
        }
        titleTrailing={
          <>
            {isExpiring ? (
              <InstanceExpiryCountdown
                style={styles.countdown}
                terminatesAt={terminatesAt}
              />
            ) : (
              titleTrailing
            )}
            {onOpenSwitcher ? (
              <SymbolView
                name={{ ios: "chevron.down", android: "keyboard_arrow_down" }}
                size={13}
                tintColor={theme.textSecondary}
              />
            ) : null}
          </>
        }
        titleVariant="pill"
      />
      {!wide ? (
        <ProjectWorkspaceActionsDrawer
          isRefreshing={isRefreshing}
          onClose={() => setActionsVisible(false)}
          onFiles={openFiles}
          onMcp={connection ? () => setMcpVisible(true) : undefined}
          onRefresh={onRefresh}
          onSettings={openSettings}
          visible={actionsVisible}
        />
      ) : null}
      {connection ? (
        <ProjectMcpDrawer
          connection={connection}
          onClose={() => setMcpVisible(false)}
          visible={mcpVisible}
        />
      ) : null}
    </>
  );
});

function RefreshButton({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel="Reload chat"
      accessibilityRole="button"
      disabled={isRefreshing}
      onPress={() => void onRefresh()}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      {isRefreshing ? (
        <ActivityIndicator size="small" />
      ) : (
        <SymbolView
          name={{ ios: "arrow.clockwise", android: "refresh" }}
          size={19}
          tintColor={theme.textSecondary}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  actions: { alignItems: "center", borderRadius: 999, flexDirection: "row" },
  compactAction: { width: 36 },
  badge: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 9,
    justifyContent: "center",
    minHeight: 17,
    minWidth: 17,
    paddingHorizontal: 4,
    position: "absolute",
    right: 0,
    top: 0,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800", lineHeight: 12 },
  countdown: { color: "#f59e0b", fontSize: 11, fontWeight: "700" },
  expiringTitle: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    borderColor: "rgba(245, 158, 11, 0.55)",
    borderWidth: 1,
  },
  pressed: { opacity: 0.62 },
});
