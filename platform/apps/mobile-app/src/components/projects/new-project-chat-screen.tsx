import type { OpencodePromptSelection } from "@repo/api-client";
import { useOpencodeInventory, useStartOpencodeSession } from "@repo/api-hooks";
import { useProjectsStore, useSessionsStore } from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import {
  OpencodeComposer,
  type ComposerImageAttachment,
} from "@/components/projects/opencode-composer";
import { ProjectChatStatus } from "@/components/projects/project-chat-status";
import { ProjectDomainsButton } from "@/components/projects/project-domains-drawer";
import { ProjectFilesButton } from "@/components/projects/project-files-button";
import { ProjectSettingsButton } from "@/components/projects/project-settings-button";
import { ThemedText } from "@/components/themed-text";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { PAGE_CHROME } from "@/constants/page-chrome";
import { Fonts } from "@/constants/theme";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import {
  formatInstanceTimeRemaining,
  getInstanceRemainingMs,
  isInstanceExpiringSoon,
} from "@/lib/instance-expiry";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function NewProjectChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    agent?: string | string[];
    directory?: string | string[];
    model?: string | string[];
    projectId?: string | string[];
    projectSessionId?: string | string[];
    returnOpencodeSessionId?: string | string[];
    returnProjectId?: string | string[];
    returnProjectSessionId?: string | string[];
    variant?: string | string[];
  }>();
  const projectId = firstParam(params.projectId);
  const projectSessionId = firstParam(params.projectSessionId);
  const openTerminal = useCallback(() => {
    Keyboard.dismiss();
    router.push({
      pathname: "/projects/[projectId]/sessions/[projectSessionId]/terminal",
      params: { projectId, projectSessionId },
    });
  }, [projectId, projectSessionId, router]);
  const directory = firstParam(params.directory);
  const inheritedAgent = firstParam(params.agent);
  const inheritedModel = firstParam(params.model);
  const inheritedVariant = firstParam(params.variant);
  const returnOpencodeSessionId = firstParam(params.returnOpencodeSessionId);
  const returnProjectId = firstParam(params.returnProjectId);
  const returnProjectSessionId = firstParam(params.returnProjectSessionId);
  const projectName = useProjectsStore(
    (store) =>
      store.projects.find((project) => project.id === projectId)?.name ??
      "Project",
  );
  const sessionName = useSessionsStore(
    (store) =>
      store.sessions.find((entry) => entry.session.id === projectSessionId)
        ?.session.name ?? "Session",
  );
  const runtime = useProjectRuntime(projectSessionId);
  const now = useCurrentTime(Boolean(runtime.instance?.terminates_at));
  const instanceRemainingMs = getInstanceRemainingMs(
    runtime.instance?.terminates_at,
    now,
  );
  const isInstanceExpiring = isInstanceExpiringSoon(instanceRemainingMs);
  const inventoryQuery = useOpencodeInventory(
    projectSessionId,
    runtime.serverUrl,
    runtime.accessToken,
    runtime.password,
  );
  const startSession = useStartOpencodeSession();
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<ComposerImageAttachment[]>([]);
  const [selection, setSelection] = useState<OpencodePromptSelection>(() => ({
    agent: inheritedAgent || undefined,
    model: inheritedModel || undefined,
    variant: inheritedVariant || undefined,
  }));

  useEffect(() => {
    const inventory = inventoryQuery.data;
    if (!inventory) return;
    setSelection((current) => ({
      ...current,
      model:
        current.model &&
        inventory.models.some((model) => model.id === current.model)
          ? current.model
          : (inventory.defaultSelection.model ?? inventory.models[0]?.id),
      agent:
        current.agent &&
        inventory.agents.some((agent) => agent.id === current.agent)
          ? current.agent
          : (inventory.defaultSelection.agent ??
            inventory.agents.find((agent) => agent.mode === "primary")?.id ??
            inventory.agents[0]?.id),
    }));
  }, [inventoryQuery.data]);

  const goBack = () => {
    if (returnOpencodeSessionId && returnProjectId && returnProjectSessionId) {
      if (
        returnProjectId === projectId &&
        returnProjectSessionId === projectSessionId
      ) {
        router.setParams({ chatId: returnOpencodeSessionId });
        return;
      }

      router.replace({
        pathname: "/projects/[projectId]/sessions/[projectSessionId]/chat",
        params: {
          chatId: returnOpencodeSessionId,
          projectId: returnProjectId,
          projectSessionId: returnProjectSessionId,
        },
      });
      return;
    }

    router.replace("/");
  };

  const submit = () => {
    const text = prompt.trim();
    if (
      (!text && attachments.length === 0) ||
      startSession.isPending ||
      !runtime.instance
    )
      return;

    startSession.mutate({
      chatId: projectSessionId,
      serverUrl: runtime.serverUrl,
      accessToken: runtime.accessToken,
      password: runtime.password,
      directory,
      text,
      files: [],
      attachments,
      selection,
      onSessionCreated: (opencodeSessionId) => {
        router.setParams({ chatId: opencodeSessionId });
      },
    });
  };

  if (runtime.isPending) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (runtime.isError || !runtime.instance) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ProjectChatStatus
          description="This project session is no longer running. Resume it before creating a chat."
          onBack={goBack}
          title="OpenCode server unavailable"
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <>
        <PageChromeLayout
          bottom={
            <View
              pointerEvents="none"
              style={{ height: PAGE_CHROME.bottom.composerFadeInset }}
            />
          }
          top={
            <PageHeader
              onBack={goBack}
              right={
                <View
                  style={[
                    styles.headerActions,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ProjectFilesButton
                    projectId={projectId}
                    projectSessionId={projectSessionId}
                  />
                  <ProjectSettingsButton
                    projectId={projectId}
                    projectSessionId={projectSessionId}
                  />
                  <ProjectDomainsButton
                    instanceId={runtime.instance.id}
                    opencodePassword={runtime.password}
                    projectId={projectId}
                  />
                </View>
              }
              title="New chat"
              titleContainerStyle={
                isInstanceExpiring
                  ? {
                      backgroundColor: "rgba(245, 158, 11, 0.14)",
                      borderColor: "rgba(245, 158, 11, 0.55)",
                      borderWidth: 1,
                    }
                  : undefined
              }
              titleTrailing={
                isInstanceExpiring ? (
                  <ThemedText style={styles.headerCountdown}>
                    {formatInstanceTimeRemaining(instanceRemainingMs)}
                  </ThemedText>
                ) : (
                  <ThemedText
                    numberOfLines={1}
                    style={styles.headerSubtitle}
                    themeColor="textSecondary"
                  >
                    {projectName} · {sessionName}
                  </ThemedText>
                )
              }
              titleVariant="pill"
            />
          }
        >
          {({ topInset }) => (
            <View
              style={[
                styles.body,
                { backgroundColor: "transparent", paddingTop: topInset },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.inputSolidBackground,
                  { backgroundColor: theme.background },
                ]}
              />
              <View>
                <ThemedText style={styles.heading}>
                  What should we work on?
                </ThemedText>
                <ThemedText style={styles.directory} themeColor="textSecondary">
                  {directory}
                </ThemedText>
              </View>
              <OpencodeComposer
                accessibilityLabel="First prompt"
                attachments={attachments}
                autoFocus
                inventory={inventoryQuery.data}
                isSubmitting={startSession.isPending}
                onChangeSelection={setSelection}
                onChangeAttachments={setAttachments}
                onChangeText={setPrompt}
                onOpenTerminal={openTerminal}
                onSubmit={submit}
                placeholder="Describe the task…"
                selection={selection}
                value={prompt}
              />
              {startSession.error ? (
                <ThemedText style={styles.error}>
                  {startSession.error.message}
                </ThemedText>
              ) : null}
            </View>
          )}
        </PageChromeLayout>
      </>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 24,
    justifyContent: "flex-end",
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  directory: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  error: {
    color: "#ef4444",
    fontSize: 13,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerActions: {
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    height: 44,
    overflow: "hidden",
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerCountdown: {
    color: "#f59e0b",
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: "800",
  },
  headerExpiryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  headerSubtitle: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 15,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 17,
  },
  headerTitlePill: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    height: 42,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 16,
  },
  inputSolidBackground: {
    bottom: 0,
    height: PAGE_CHROME.bottom.estimatedInset,
    left: 0,
    position: "absolute",
    right: 0,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.72,
  },
  screen: {
    flex: 1,
  },
});
