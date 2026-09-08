import type { ProjectFile } from "@repo/api-client";
import {
  useCreateProjectFile,
  useDeleteProjectFile,
  useGetProjectFilesById,
  useUpdateProjectFile,
} from "@repo/api-hooks";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Draft = { content: string; name: string; path: string };

const emptyDraft: Draft = { content: "", name: ".env", path: "." };

function toDraft(file: ProjectFile): Draft {
  return {
    content: file.projectFileData?.content ?? "",
    name: file.name,
    path: file.path,
  };
}

function draftsMatch(left: Draft, right: Draft) {
  return (
    left.content === right.content &&
    left.name === right.name &&
    left.path === right.path
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function EnvironmentFilesScreen({ projectId }: { projectId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const filesQuery = useGetProjectFilesById(projectId || null);
  const createFile = useCreateProjectFile();
  const updateFile = useUpdateProjectFile();
  const deleteFile = useDeleteProjectFile();
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<ProjectFile | null>(
    null,
  );
  const files = useMemo(
    () =>
      (filesQuery.data ?? []).filter((file) => file.name.startsWith(".env")),
    [filesQuery.data],
  );
  const currentSelectedFile = selectedFile
    ? (files.find((file) => file.id === selectedFile.id) ?? selectedFile)
    : null;
  const isEditing = isAdding || Boolean(selectedFile);
  const isDirty = isAdding
    ? !draftsMatch(draft, emptyDraft)
    : Boolean(savedDraft && !draftsMatch(draft, savedDraft));
  const isSaving = createFile.isPending || updateFile.isPending;

  const closeEditor = useCallback(() => {
    setSelectedFile(null);
    setSavedDraft(null);
    setDraft(emptyDraft);
    setIsAdding(false);
  }, []);

  const afterDiscard = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      Alert.alert(
        "Discard unsaved changes?",
        "Your environment file edits will be lost.",
        [
          { text: "Keep editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: action },
        ],
      );
    },
    [isDirty],
  );

  const goBack = useCallback(() => {
    if (isEditing) {
      afterDiscard(closeEditor);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/", params: { view: "projects" } });
  }, [afterDiscard, closeEditor, isEditing, router]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (!isEditing) return false;
          afterDiscard(closeEditor);
          return true;
        },
      );
      return () => subscription.remove();
    }, [afterDiscard, closeEditor, isEditing]),
  );

  const startAdding = () => {
    setSelectedFile(null);
    setSavedDraft(null);
    setDraft(emptyDraft);
    setIsAdding(true);
  };

  const openFile = (file: ProjectFile) => {
    const nextDraft = toDraft(file);
    setSelectedFile(file);
    setSavedDraft(nextDraft);
    setDraft(nextDraft);
    setIsAdding(false);
  };

  const resetDraft = () => setDraft(isAdding ? emptyDraft : savedDraft!);

  const saveDraft = async () => {
    if (isSaving) return;
    const name = draft.name.trim();
    const path = draft.path.trim();
    if (!name.startsWith(".env")) {
      Toast.show({
        type: "error",
        text1: "Environment file names must start with .env",
      });
      return;
    }
    if (!path) {
      Toast.show({
        type: "error",
        text1: "Add the directory where this file should be placed",
      });
      return;
    }

    const nextDraft = { ...draft, name, path };
    try {
      if (isAdding) {
        await createFile.mutateAsync({ id: projectId, ...nextDraft });
        closeEditor();
        Toast.show({ type: "success", text1: "Environment file added" });
        return;
      }
      if (!selectedFile) return;
      await updateFile.mutateAsync({
        id: projectId,
        fileId: selectedFile.id,
        ...nextDraft,
      });
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setSelectedFile({
        ...selectedFile,
        name,
        path,
        projectFileData: selectedFile.projectFileData
          ? { ...selectedFile.projectFileData, content: draft.content }
          : selectedFile.projectFileData,
      });
      Toast.show({ type: "success", text1: "Environment file saved" });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Environment file could not be saved"),
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate || deleteFile.isPending) return;
    try {
      await deleteFile.mutateAsync({
        id: projectId,
        fileId: deleteCandidate.id,
      });
      setDeleteCandidate(null);
      closeEditor();
      Toast.show({ type: "success", text1: "Environment file deleted" });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: getErrorMessage(error, "Environment file could not be deleted"),
      });
    }
  };

  const listActions = (
    <View style={styles.headerActions}>
      <HeaderAction
        accessibilityLabel="Refresh environment files"
        disabled={filesQuery.isFetching}
        icon={{ ios: "arrow.clockwise", android: "refresh" }}
        loading={filesQuery.isFetching}
        onPress={() => void filesQuery.refetch()}
      />
      <HeaderAction
        accessibilityLabel="Add environment file"
        icon={{ ios: "plus", android: "add" }}
        onPress={startAdding}
      />
    </View>
  );

  const editorActions = (
    <View style={styles.headerActions}>
      {isDirty ? (
        <HeaderAction
          accessibilityLabel="Reset changes"
          disabled={isSaving}
          icon={{ ios: "arrow.uturn.backward", android: "undo" }}
          onPress={resetDraft}
        />
      ) : null}
      <HeaderAction
        accessibilityLabel={
          isAdding ? "Create environment file" : "Save environment file"
        }
        disabled={isSaving || (!isAdding && !isDirty)}
        icon={{ ios: "checkmark", android: "save" }}
        loading={isSaving}
        onPress={() => void saveDraft()}
      />
    </View>
  );

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <Stack.Screen options={{ gestureEnabled: !isEditing }} />
      <PageChromeLayout
        top={
          <PageHeader
            onBack={goBack}
            right={isEditing ? editorActions : listActions}
            title={
              isAdding
                ? "New environment file"
                : (selectedFile?.name ?? "Environment files")
            }
          />
        }
      >
        {({ topInset }) =>
          isEditing ? (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={topInset}
              style={styles.body}
            >
              <ScrollView
                contentContainerStyle={[
                  styles.editor,
                  { paddingTop: topInset },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {!isAdding && currentSelectedFile ? (
                  <View style={styles.editorMeta}>
                    <ThemedText themeColor="textSecondary">
                      Version{" "}
                      {currentSelectedFile.projectFileData?.version ?? 1}
                    </ThemedText>
                    <Pressable
                      accessibilityLabel={`Delete ${currentSelectedFile.name}`}
                      accessibilityRole="button"
                      disabled={deleteFile.isPending}
                      onPress={() => setDeleteCandidate(currentSelectedFile)}
                      style={({ pressed }) => [
                        styles.deleteButton,
                        { backgroundColor: "rgba(239, 68, 68, 0.12)" },
                        pressed && styles.pressed,
                      ]}
                    >
                      <SymbolView
                        name={{ ios: "trash", android: "delete" }}
                        size={16}
                        tintColor="#ef4444"
                      />
                      <ThemedText style={styles.deleteLabel}>Delete</ThemedText>
                    </Pressable>
                  </View>
                ) : null}
                <Field label="File name" hint="Must start with .env">
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSaving}
                    onChangeText={(name) =>
                      setDraft((value) => ({ ...value, name }))
                    }
                    placeholder=".env.local"
                    placeholderTextColor={theme.textSecondary}
                    spellCheck={false}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundElement,
                        color: theme.text,
                      },
                    ]}
                    value={draft.name}
                  />
                </Field>
                <Field label="Directory" hint="Use . for the repository root">
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSaving}
                    onChangeText={(path) =>
                      setDraft((value) => ({ ...value, path }))
                    }
                    placeholder="apps/web"
                    placeholderTextColor={theme.textSecondary}
                    spellCheck={false}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundElement,
                        color: theme.text,
                      },
                    ]}
                    value={draft.path}
                  />
                </Field>
                <Field
                  label="Contents"
                  hint={`${draft.content.split("\n").length} lines · Stored as encrypted project-file content`}
                >
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSaving}
                    multiline
                    onChangeText={(content) =>
                      setDraft((value) => ({ ...value, content }))
                    }
                    placeholder={"DATABASE_URL=...\nAPI_KEY=..."}
                    placeholderTextColor={theme.textSecondary}
                    scrollEnabled={false}
                    spellCheck={false}
                    style={[
                      styles.input,
                      styles.contentInput,
                      {
                        backgroundColor: theme.backgroundElement,
                        color: theme.text,
                      },
                    ]}
                    textAlignVertical="top"
                    value={draft.content}
                  />
                </Field>
              </ScrollView>
            </KeyboardAvoidingView>
          ) : (
            <FlatList
              contentContainerStyle={[
                styles.list,
                { paddingTop: topInset },
                files.length === 0 && styles.emptyList,
              ]}
              data={files}
              keyExtractor={(file) => file.id}
              refreshControl={
                <RefreshControl
                  onRefresh={() => void filesQuery.refetch()}
                  refreshing={filesQuery.isRefetching}
                  tintColor={theme.textSecondary}
                />
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityLabel={`Edit ${item.name}`}
                  accessibilityRole="button"
                  onPress={() => openFile(item)}
                  style={({ pressed }) => [
                    styles.fileRow,
                    { borderColor: theme.backgroundSelected },
                    pressed && { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <View
                    style={[
                      styles.fileIcon,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <SymbolView
                      name={{ ios: "doc.text", android: "description" }}
                      size={19}
                      tintColor={theme.textSecondary}
                    />
                  </View>
                  <View style={styles.fileDetails}>
                    <ThemedText numberOfLines={1} style={styles.fileName}>
                      {item.name}
                    </ThemedText>
                    <ThemedText
                      numberOfLines={1}
                      style={styles.filePath}
                      themeColor="textSecondary"
                    >
                      {item.path} · Version {item.projectFileData?.version ?? 1}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name={{ ios: "chevron.right", android: "chevron_right" }}
                    size={17}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              )}
              ListEmptyComponent={
                filesQuery.isPending ? (
                  <ScreenState label="Loading environment files…" loading />
                ) : filesQuery.isError ? (
                  <ScreenState
                    actionLabel="Try again"
                    label="Environment files could not be loaded."
                    onAction={() => void filesQuery.refetch()}
                  />
                ) : (
                  <ScreenState
                    actionLabel="Add file"
                    label="No environment files yet."
                    onAction={startAdding}
                  />
                )
              }
            />
          )
        }
      </PageChromeLayout>
      <ConfirmationDrawer
        confirmLabel="Delete file"
        description={`${deleteCandidate?.name ?? "This file"} will be permanently deleted.`}
        isConfirming={deleteFile.isPending}
        onCancel={() => {
          if (!deleteFile.isPending) setDeleteCandidate(null);
        }}
        onConfirm={() => void confirmDelete()}
        title="Delete environment file?"
        visible={Boolean(deleteCandidate)}
      />
    </SafeAreaView>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint: string;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      {children}
      <ThemedText style={styles.hint} themeColor="textSecondary">
        {hint}
      </ThemedText>
    </View>
  );
}

function HeaderAction({
  accessibilityLabel,
  disabled = false,
  icon,
  loading = false,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: SymbolViewProps["name"];
  loading?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerAction,
        { backgroundColor: theme.backgroundElement },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <SymbolView name={icon} size={18} tintColor={theme.text} />
      )}
    </Pressable>
  );
}

function ScreenState({
  actionLabel,
  label,
  loading = false,
  onAction,
}: {
  actionLabel?: string;
  label: string;
  loading?: boolean;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.state}>
      {loading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <SymbolView
          name={{ ios: "doc.text", android: "description" }}
          size={30}
          tintColor={theme.textSecondary}
        />
      )}
      <ThemedText style={styles.stateLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.stateAction,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.stateActionLabel}>{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  contentInput: {
    fontFamily: Fonts.mono,
    lineHeight: 21,
    minHeight: 300,
    paddingTop: 13,
  },
  deleteButton: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  deleteLabel: { color: "#ef4444", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.4 },
  editor: { gap: 20, paddingBottom: 48, paddingHorizontal: 18 },
  editorMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emptyList: { flexGrow: 1 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: "700" },
  fileDetails: { flex: 1, gap: 3 },
  fileIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  fileName: { fontSize: 15, fontWeight: "700" },
  filePath: { fontFamily: Fonts.mono, fontSize: 11 },
  fileRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 70,
    paddingHorizontal: 4,
  },
  headerAction: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  headerActions: { flexDirection: "row", gap: 7 },
  hint: { fontSize: 11, lineHeight: 16 },
  input: {
    borderRadius: 12,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  list: { paddingBottom: 40, paddingHorizontal: 18 },
  pressed: { opacity: 0.65 },
  screen: { flex: 1 },
  state: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    minHeight: 300,
    paddingHorizontal: 24,
  },
  stateAction: {
    borderRadius: 10,
    marginTop: 4,
    minHeight: 42,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  stateActionLabel: { fontSize: 14, fontWeight: "700" },
  stateLabel: { fontSize: 14, textAlign: "center" },
});
