import {
  findOpencodeFiles,
  type OpencodePromptSelection,
} from "@repo/api-client";
import {
  useOpencodeInventory,
  useOpencodeProjectDirectories,
  useStartOpencodeSession,
  useUserSettings,
} from "@repo/api-hooks";
import { useProjectsStore, useSessionsStore } from "@repo/app-store";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import {
  type ComposerDraft,
  OpencodeComposerController,
} from "@/components/projects/opencode-composer";
import { ProjectChatStatus } from "@/components/projects/project-chat-status";
import { ProjectWorkspaceTopBar } from "@/components/projects/project-workspace-top-bar";
import { ThemedText } from "@/components/themed-text";
import { PageChromeLayout } from "@/components/page-chrome";
import { PAGE_CHROME } from "@/constants/page-chrome";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";
import { useInstanceExpiryWarning } from "@/components/projects/instance-expiry-countdown";

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
  const isInstanceExpiring = useInstanceExpiryWarning(
    runtime.instance?.terminates_at,
  );
  const inventoryQuery = useOpencodeInventory(
    projectSessionId,
    runtime.serverUrl,
    runtime.accessToken,
    runtime.password,
  );
  const directoriesQuery = useOpencodeProjectDirectories(
    projectSessionId,
    runtime.serverUrl,
    runtime.accessToken,
    runtime.password,
  );
  const resolvedDirectory = directory || directoriesQuery.data?.[0]?.worktree;
  const { data: userSettings } = useUserSettings();
  const startSession = useStartOpencodeSession();
  const [selection, setSelection] = useState<OpencodePromptSelection>(() => ({
    agent: inheritedAgent || undefined,
    model: inheritedModel || undefined,
    variant: inheritedVariant || undefined,
  }));
  const searchFiles = useCallback(
    (query: string) =>
      findOpencodeFiles(
        projectSessionId,
        runtime.serverUrl,
        runtime.accessToken,
        query,
        resolvedDirectory,
        runtime.password,
      ),
    [
      projectSessionId,
      resolvedDirectory,
      runtime.accessToken,
      runtime.password,
      runtime.serverUrl,
    ],
  );

  useEffect(() => {
    const inventory = inventoryQuery.data;
    if (!inventory) return;
    const configuredDefaultModel = userSettings?.default_model ?? undefined;
    const defaultModel = inventory.models.some(
      (model) => model.id === configuredDefaultModel,
    )
      ? configuredDefaultModel
      : (inventory.defaultSelection.model ?? inventory.models[0]?.id);
    setSelection((current) => ({
      ...current,
      model:
        current.model &&
        inventory.models.some((model) => model.id === current.model)
          ? current.model
          : defaultModel,
      agent:
        current.agent &&
        inventory.agents.some((agent) => agent.id === current.agent)
          ? current.agent
          : (inventory.defaultSelection.agent ??
            inventory.agents.find((agent) => agent.mode === "primary")?.id ??
            inventory.agents[0]?.id),
    }));
  }, [inventoryQuery.data, userSettings?.default_model]);

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

  const submit = (draft: ComposerDraft, restore: () => void) => {
    const { attachments, fileReferences, text } = draft;
    if (
      (!text && attachments.length === 0) ||
      startSession.isPending ||
      !runtime.instance
    )
      return;

    startSession.mutate(
      {
        chatId: projectSessionId,
        serverUrl: runtime.serverUrl,
        accessToken: runtime.accessToken,
        password: runtime.password,
        directory: resolvedDirectory,
        text,
        files: [],
        attachments,
        fileReferences,
        selection,
        onSessionCreated: (opencodeSessionId) => {
          router.setParams({ chatId: opencodeSessionId });
        },
      },
      { onError: restore },
    );
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
            <ProjectWorkspaceTopBar
              connection={
                resolvedDirectory
                  ? {
                      accessToken: runtime.accessToken,
                      chatId: projectSessionId,
                      directory: resolvedDirectory,
                      password: runtime.password,
                      serverUrl: runtime.serverUrl,
                    }
                  : undefined
              }
              instanceId={runtime.instance.id}
              isExpiring={isInstanceExpiring}
              isRefreshing={
                inventoryQuery.isFetching || directoriesQuery.isFetching
              }
              onBack={goBack}
              onRefresh={() => {
                void Promise.allSettled([
                  inventoryQuery.refetch(),
                  directoriesQuery.refetch(),
                ]);
              }}
              opencodePassword={runtime.password}
              projectId={projectId}
              projectSessionId={projectSessionId}
              showReview={false}
              terminatesAt={runtime.instance.terminates_at}
              title="New chat"
              titleTrailing={
                <ThemedText
                  numberOfLines={1}
                  style={styles.headerSubtitle}
                  themeColor="textSecondary"
                >
                  {projectName} · {sessionName}
                </ThemedText>
              }
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
                  {resolvedDirectory}
                </ThemedText>
              </View>
              <OpencodeComposerController
                accessibilityLabel="First prompt"
                autoFocus
                inventory={inventoryQuery.data}
                isSubmitting={startSession.isPending}
                onChangeSelection={setSelection}
                onOpenTerminal={openTerminal}
                onSubmit={submit}
                placeholder="Describe the task…"
                providerConnection={{
                  accessToken: runtime.accessToken,
                  chatId: projectSessionId,
                  directory: resolvedDirectory,
                  onConnected: async () => {
                    await inventoryQuery.refetch();
                  },
                  password: runtime.password,
                  serverUrl: runtime.serverUrl,
                }}
                selection={selection}
                searchFiles={searchFiles}
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
  headerSubtitle: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 15,
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
