import {
  getRuntimeChildPath,
  getRuntimeFileBreadcrumbs,
  getRuntimeParentPath,
  isEditableRuntimeContentType,
  sortRuntimeFileEntries,
  type RuntimeFileEntry,
} from "@repo/api-client";
import {
  useCreateRuntimeFileEntry,
  useDeleteRuntimeFileEntry,
  useRuntimeDirectory,
  useRuntimeFile,
  useUpdateRuntimeFile,
  useUploadRuntimeFile,
  type RuntimeFilesConnection,
} from "@repo/api-hooks";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { fetch as expoFetch } from "expo/fetch";
import { File as ExpoFile } from "expo-file-system";
import { Image } from "expo-image";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ProjectFileCreateDrawer } from "@/components/projects/project-file-create-drawer";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useProjectRuntime } from "@/hooks/use-project-runtime";
import { useTheme } from "@/hooks/use-theme";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function decodeContent(content: string) {
  const binary = atob(content);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

function requestErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ProjectFilesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    projectId?: string | string[];
    projectSessionId?: string | string[];
  }>();
  const projectSessionId = firstParam(params.projectSessionId);
  const runtime = useProjectRuntime(projectSessionId);
  const connection = useMemo<RuntimeFilesConnection>(
    () => ({
      instanceId: runtime.instance?.id ?? "",
      runtimeUrl: runtime.runtimeUrl,
      localToken: runtime.localToken,
      accessToken: runtime.accessToken,
      fetch: expoFetch as unknown as typeof globalThis.fetch,
    }),
    [
      runtime.accessToken,
      runtime.instance?.id,
      runtime.localToken,
      runtime.runtimeUrl,
    ],
  );
  const [requestedPath, setRequestedPath] = useState<string | undefined>();
  const [pathInput, setPathInput] = useState("");
  const [openingDirectoryPath, setOpeningDirectoryPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<RuntimeFileEntry | null>(
    null,
  );
  const [fileContent, setFileContent] = useState("");
  const [savedFileContent, setSavedFileContent] = useState("");
  const [fileContentType, setFileContentType] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] =
    useState<RuntimeFileEntry | null>(null);
  const [error, setError] = useState("");

  const directoryQuery = useRuntimeDirectory(connection, requestedPath);
  const directory = directoryQuery.data ?? null;
  const fileQuery = useRuntimeFile(connection, selectedFile?.path);
  const createEntryMutation = useCreateRuntimeFileEntry(connection);
  const updateFileMutation = useUpdateRuntimeFile(connection);
  const uploadFileMutation = useUploadRuntimeFile(connection);
  const deleteEntryMutation = useDeleteRuntimeFileEntry(connection);
  const hasUnsavedChanges =
    Boolean(selectedFile) && fileContent !== savedFileContent;
  const canEdit = Boolean(
    selectedFile && isEditableRuntimeContentType(fileContentType),
  );
  const isImage = fileContentType.startsWith("image/");
  const sortedEntries = useMemo(
    () => sortRuntimeFileEntries(directory?.entries ?? []),
    [directory?.entries],
  );
  const breadcrumbs = useMemo(
    () => getRuntimeFileBreadcrumbs(directory?.path),
    [directory?.path],
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setFileContent("");
    setSavedFileContent("");
    setFileContentType("");
  }, []);

  const afterDiscard = useCallback(
    (action: () => void) => {
      if (!hasUnsavedChanges) {
        action();
        return;
      }
      Alert.alert(
        "Discard unsaved changes?",
        "Your edits to this file will be lost.",
        [
          { text: "Keep editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: action },
        ],
      );
    },
    [hasUnsavedChanges],
  );

  const goBack = useCallback(() => {
    if (selectedFile) {
      afterDiscard(clearSelection);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [afterDiscard, clearSelection, router, selectedFile]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (!selectedFile) return false;
          afterDiscard(clearSelection);
          return true;
        },
      );
      return () => subscription.remove();
    }, [afterDiscard, clearSelection, selectedFile]),
  );

  useEffect(() => {
    const path = directoryQuery.data?.path;
    if (!path || directoryQuery.isPlaceholderData) return;
    setPathInput(path);
    setOpeningDirectoryPath("");
  }, [directoryQuery.data?.path, directoryQuery.isPlaceholderData]);

  useEffect(() => {
    if (!directoryQuery.isFetching) setOpeningDirectoryPath("");
  }, [directoryQuery.isFetching]);

  useEffect(() => {
    if (directoryQuery.error) setError(directoryQuery.error.message);
  }, [directoryQuery.error]);

  useEffect(() => {
    const result = fileQuery.data;
    if (!result || !selectedFile || hasUnsavedChanges) return;
    const contentType = result.contentType || "application/octet-stream";
    setFileContentType(contentType);
    try {
      const content = isEditableRuntimeContentType(contentType)
        ? decodeContent(result.content)
        : result.content;
      setFileContent(content);
      setSavedFileContent(content);
    } catch {
      setError("Could not decode this file");
    }
  }, [fileQuery.data, hasUnsavedChanges, selectedFile]);

  useEffect(() => {
    if (fileQuery.error) setError(fileQuery.error.message);
  }, [fileQuery.error]);

  const openDirectory = (path: string) => {
    afterDiscard(() => {
      setError("");
      clearSelection();
      setOpeningDirectoryPath(path);
      if (requestedPath === path) void directoryQuery.refetch();
      else setRequestedPath(path);
    });
  };

  const openFile = (entry: RuntimeFileEntry) => {
    afterDiscard(() => {
      setError("");
      setSelectedFile(entry);
      setFileContent("");
      setSavedFileContent("");
      setFileContentType("");
    });
  };

  const saveFile = async () => {
    if (!selectedFile || !canEdit || !hasUnsavedChanges) return;
    try {
      setError("");
      await updateFileMutation.mutateAsync({
        path: selectedFile.path,
        content: fileContent,
      });
      setSavedFileContent(fileContent);
      Toast.show({ type: "success", text1: `${selectedFile.name} saved` });
    } catch (saveError) {
      const message = requestErrorMessage(saveError, "Could not save file");
      setError(message);
      Toast.show({ type: "error", text1: message });
    }
  };

  const copyFile = async () => {
    if (!canEdit) return;
    await Clipboard.setStringAsync(fileContent);
    Toast.show({ type: "success", text1: "File contents copied" });
  };

  const createEntry = async (name: string) => {
    if (!directory) return;
    try {
      setError("");
      const path = getRuntimeChildPath(directory.path, name);
      const isDirectory = name.trim().endsWith("/");
      await createEntryMutation.mutateAsync(path);
      setIsCreateOpen(false);
      Toast.show({
        type: "success",
        text1: `${isDirectory ? "Folder" : "File"} created`,
      });
    } catch (createError) {
      const message = requestErrorMessage(
        createError,
        "Could not create file or folder",
      );
      setError(message);
      Toast.show({ type: "error", text1: message });
    }
  };

  const uploadFile = async () => {
    if (!directory || uploadFileMutation.isPending) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "*/*",
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const file =
        Platform.OS === "web" && asset.file
          ? asset.file
          : new ExpoFile(asset.uri);
      await uploadFileMutation.mutateAsync({
        path: directory.path,
        file,
        fileName: asset.name,
      });
      Toast.show({ type: "success", text1: `${asset.name} uploaded` });
    } catch (uploadError) {
      const message = requestErrorMessage(uploadError, "Could not upload file");
      setError(message);
      Toast.show({ type: "error", text1: message });
    }
  };

  const deleteEntry = async () => {
    if (!deleteCandidate) return;
    const target = deleteCandidate;
    try {
      await deleteEntryMutation.mutateAsync(target.path);
      setDeleteCandidate(null);
      if (selectedFile?.path === target.path) clearSelection();
      Toast.show({ type: "success", text1: `${target.name} deleted` });
    } catch (deleteError) {
      const message = requestErrorMessage(deleteError, "Could not delete item");
      setError(message);
      Toast.show({ type: "error", text1: message });
    }
  };

  const directoryActions = (
    <View
      style={[
        styles.headerActions,
        { backgroundColor: theme.backgroundElement },
      ]}
    >
      <HeaderAction
        accessibilityLabel="Refresh files"
        disabled={!directory || directoryQuery.isFetching}
        icon={{ ios: "arrow.clockwise", android: "refresh" }}
        loading={directoryQuery.isFetching && !openingDirectoryPath}
        onPress={() => void directoryQuery.refetch()}
      />
      <HeaderAction
        accessibilityLabel="Create file or folder"
        disabled={!directory}
        icon={{ ios: "plus", android: "add" }}
        onPress={() => setIsCreateOpen(true)}
      />
      <HeaderAction
        accessibilityLabel="Upload file"
        disabled={!directory || uploadFileMutation.isPending}
        icon={{ ios: "square.and.arrow.up", android: "upload_file" }}
        loading={uploadFileMutation.isPending}
        onPress={() => void uploadFile()}
      />
    </View>
  );

  const fileActions = (
    <View
      style={[
        styles.headerActions,
        { backgroundColor: theme.backgroundElement },
      ]}
    >
      <HeaderAction
        accessibilityLabel="Copy file contents"
        disabled={!canEdit}
        icon={{ ios: "doc.on.doc", android: "content_copy" }}
        onPress={() => void copyFile()}
      />
      <HeaderAction
        accessibilityLabel="Save file"
        disabled={
          !canEdit || !hasUnsavedChanges || updateFileMutation.isPending
        }
        icon={{ ios: "checkmark", android: "save" }}
        loading={updateFileMutation.isPending}
        onPress={() => void saveFile()}
      />
    </View>
  );

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <Stack.Screen options={{ gestureEnabled: !selectedFile }} />
      <PageChromeLayout
        top={
          <PageHeader
            onBack={goBack}
            right={selectedFile ? fileActions : directoryActions}
            title={selectedFile?.name ?? "Files"}
          />
        }
      >
        {({ topInset }) => (
          <View style={[styles.body, { paddingTop: topInset }]}>
            {error ? (
              <Pressable
                accessibilityLabel="Dismiss error"
                onPress={() => setError("")}
                style={[
                  styles.error,
                  { backgroundColor: "rgba(239, 68, 68, 0.12)" },
                ]}
              >
                <ThemedText style={styles.errorText}>{error}</ThemedText>
                <SymbolView
                  name={{ ios: "xmark", android: "close" }}
                  size={15}
                  tintColor="#ef4444"
                />
              </Pressable>
            ) : null}

            {runtime.isPending ? (
              <ScreenState label="Connecting to runtime files…" loading />
            ) : runtime.isError || !runtime.instance ? (
              <ScreenState label="Resume this project session to manage its files." />
            ) : !runtime.localToken || !runtime.accessToken ? (
              <ScreenState label="Runtime credentials are unavailable." />
            ) : selectedFile ? (
              <FileViewer
                canEdit={canEdit}
                content={fileContent}
                contentType={fileContentType}
                file={selectedFile}
                image={isImage}
                loading={fileQuery.isFetching}
                onChangeContent={setFileContent}
              />
            ) : (
              <View style={styles.directoryView}>
                <View style={styles.pathRow}>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!directoryQuery.isFetching}
                    onChangeText={setPathInput}
                    onSubmitEditing={() => openDirectory(pathInput.trim())}
                    placeholder="Directory path"
                    placeholderTextColor={theme.textSecondary}
                    returnKeyType="go"
                    style={[
                      styles.pathInput,
                      {
                        backgroundColor: theme.backgroundElement,
                        color: theme.text,
                      },
                    ]}
                    value={pathInput}
                  />
                  <Pressable
                    accessibilityLabel="Open directory path"
                    accessibilityRole="button"
                    disabled={!pathInput.trim() || directoryQuery.isFetching}
                    onPress={() => openDirectory(pathInput.trim())}
                    style={({ pressed }) => [
                      styles.openButton,
                      { backgroundColor: theme.text },
                      (!pathInput.trim() || directoryQuery.isFetching) &&
                        styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText style={{ color: theme.background }}>
                      Open
                    </ThemedText>
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.breadcrumbBar,
                    { borderColor: theme.backgroundSelected },
                  ]}
                >
                  <Pressable
                    accessibilityLabel="Go back one folder"
                    accessibilityRole="button"
                    disabled={
                      directory?.path === "/" || directoryQuery.isFetching
                    }
                    onPress={() =>
                      openDirectory(
                        getRuntimeParentPath(directory?.path ?? "/"),
                      )
                    }
                    style={({ pressed }) => [
                      styles.breadcrumbAction,
                      (directory?.path === "/" || directoryQuery.isFetching) &&
                        styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    {openingDirectoryPath ===
                    getRuntimeParentPath(directory?.path ?? "/") ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <SymbolView
                        name={{ ios: "arrow.left", android: "arrow_back" }}
                        size={17}
                        tintColor={theme.textSecondary}
                      />
                    )}
                  </Pressable>
                  <ScrollView
                    contentContainerStyle={styles.breadcrumbs}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {breadcrumbs.length > 3 ? (
                      <BreadcrumbSeparator label="…" />
                    ) : null}
                    {breadcrumbs.slice(-3).map((breadcrumb) => (
                      <View key={breadcrumb.path} style={styles.breadcrumbItem}>
                        <BreadcrumbSeparator />
                        <Pressable
                          accessibilityRole="button"
                          disabled={directoryQuery.isFetching}
                          onPress={() => openDirectory(breadcrumb.path)}
                          style={({ pressed }) => pressed && styles.pressed}
                        >
                          {openingDirectoryPath === breadcrumb.path ? (
                            <ActivityIndicator size="small" />
                          ) : (
                            <ThemedText
                              numberOfLines={1}
                              style={styles.breadcrumbLabel}
                            >
                              {breadcrumb.label}
                            </ThemedText>
                          )}
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <FlatList
                  contentContainerStyle={
                    sortedEntries.length ? styles.list : styles.emptyList
                  }
                  data={sortedEntries}
                  keyExtractor={(entry) => entry.path}
                  refreshControl={
                    <RefreshControl
                      refreshing={
                        directoryQuery.isFetching && !openingDirectoryPath
                      }
                      onRefresh={() => void directoryQuery.refetch()}
                      tintColor={theme.textSecondary}
                    />
                  }
                  renderItem={({ item }) => (
                    <FileRow
                      disabled={
                        directoryQuery.isFetching ||
                        deleteEntryMutation.isPending
                      }
                      deleting={
                        deleteEntryMutation.isPending &&
                        deleteEntryMutation.variables === item.path
                      }
                      entry={item}
                      opening={openingDirectoryPath === item.path}
                      onDelete={() => setDeleteCandidate(item)}
                      onOpen={() =>
                        item.type === "directory"
                          ? openDirectory(item.path)
                          : openFile(item)
                      }
                    />
                  )}
                  ListEmptyComponent={
                    directoryQuery.isFetching && !directory ? (
                      <ScreenState label="Loading files…" loading />
                    ) : directoryQuery.isError ? (
                      <ScreenState label="Could not load files." />
                    ) : (
                      <ScreenState label="This folder is empty." />
                    )
                  }
                />
              </View>
            )}
          </View>
        )}
      </PageChromeLayout>

      <ProjectFileCreateDrawer
        currentPath={directory?.path ?? "/"}
        isCreating={createEntryMutation.isPending}
        onClose={() => {
          if (!createEntryMutation.isPending) setIsCreateOpen(false);
        }}
        onCreate={(name) => void createEntry(name)}
        visible={isCreateOpen}
      />
      <ConfirmationDrawer
        confirmLabel="Delete"
        description={
          deleteCandidate?.type === "directory"
            ? "This folder and everything inside it will be permanently deleted."
            : "This file will be permanently deleted."
        }
        isConfirming={deleteEntryMutation.isPending}
        onCancel={() => {
          if (!deleteEntryMutation.isPending) setDeleteCandidate(null);
        }}
        onConfirm={() => void deleteEntry()}
        title={`Delete ${deleteCandidate?.name ?? "item"}?`}
        visible={Boolean(deleteCandidate)}
      />
    </SafeAreaView>
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
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" />
      ) : (
        <SymbolView name={icon} size={18} tintColor={theme.textSecondary} />
      )}
    </Pressable>
  );
}

function BreadcrumbSeparator({ label }: { label?: string }) {
  const theme = useTheme();
  return label ? (
    <ThemedText style={styles.breadcrumbEllipsis} themeColor="textSecondary">
      {label}
    </ThemedText>
  ) : (
    <SymbolView
      name={{ ios: "chevron.right", android: "chevron_right" }}
      size={12}
      tintColor={theme.textSecondary}
    />
  );
}

function FileRow({
  disabled,
  deleting,
  entry,
  opening,
  onDelete,
  onOpen,
}: {
  disabled: boolean;
  deleting: boolean;
  entry: RuntimeFileEntry;
  opening: boolean;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.fileRow, { borderBottomColor: theme.backgroundSelected }]}
    >
      <Pressable
        accessibilityLabel={`Open ${entry.name}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.fileOpen,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        {opening ? (
          <ActivityIndicator color="#f59e0b" size="small" />
        ) : (
          <SymbolView
            name={
              entry.type === "directory"
                ? { ios: "folder", android: "folder" }
                : { ios: "doc", android: "description" }
            }
            size={19}
            tintColor={
              entry.type === "directory" ? "#f59e0b" : theme.textSecondary
            }
          />
        )}
        <ThemedText numberOfLines={1} style={styles.fileName}>
          {entry.name}
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityLabel={`Delete ${entry.name}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || deleting }}
        disabled={disabled || deleting}
        hitSlop={8}
        onPress={onDelete}
        style={({ pressed }) => [
          styles.deleteButton,
          pressed && styles.pressed,
        ]}
      >
        {deleting ? (
          <ActivityIndicator size="small" />
        ) : (
          <SymbolView
            name={{ ios: "trash", android: "delete" }}
            size={17}
            tintColor={theme.textSecondary}
          />
        )}
      </Pressable>
    </View>
  );
}

function FileViewer({
  canEdit,
  content,
  contentType,
  file,
  image,
  loading,
  onChangeContent,
}: {
  canEdit: boolean;
  content: string;
  contentType: string;
  file: RuntimeFileEntry;
  image: boolean;
  loading: boolean;
  onChangeContent: (content: string) => void;
}) {
  const theme = useTheme();
  if (loading && !contentType) {
    return <ScreenState label="Loading file…" loading />;
  }
  if (canEdit) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.viewer}
      >
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={onChangeContent}
          scrollEnabled
          selectionColor={theme.textSecondary}
          spellCheck={false}
          style={[styles.editor, { color: "#f4f4f5" }]}
          textAlignVertical="top"
          value={content}
        />
      </KeyboardAvoidingView>
    );
  }
  if (image) {
    return (
      <View style={styles.imageViewer}>
        <Image
          accessibilityLabel={file.name}
          contentFit="contain"
          source={`data:${contentType};base64,${content}`}
          style={styles.image}
        />
      </View>
    );
  }
  return <ScreenState label="This file type cannot be previewed safely." />;
}

function ScreenState({
  label,
  loading = false,
}: {
  label: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.state}>
      {loading ? <ActivityIndicator size="small" /> : null}
      <ThemedText style={styles.stateText} themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  breadcrumbAction: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 42,
  },
  breadcrumbBar: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 42,
  },
  breadcrumbEllipsis: { fontFamily: Fonts.mono, fontSize: 15 },
  breadcrumbItem: { alignItems: "center", flexDirection: "row", gap: 7 },
  breadcrumbLabel: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 140,
  },
  breadcrumbs: { alignItems: "center", gap: 7, paddingRight: 14 },
  deleteButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  directoryView: { flex: 1 },
  disabled: { opacity: 0.42 },
  editor: {
    backgroundColor: "#09090b",
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 20,
    padding: 16,
  },
  emptyList: { flexGrow: 1 },
  error: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 14,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  errorText: { color: "#ef4444", flex: 1, fontSize: 12, lineHeight: 17 },
  fileName: { flex: 1, fontFamily: Fonts.mono, fontSize: 13 },
  fileOpen: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 50,
    paddingLeft: 16,
  },
  fileRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  headerAction: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerActions: { borderRadius: 21, flexDirection: "row", overflow: "hidden" },
  image: { height: "100%", width: "100%" },
  imageViewer: { backgroundColor: "#09090b", flex: 1, padding: 16 },
  list: { paddingBottom: 24 },
  openButton: {
    alignItems: "center",
    borderRadius: 10,
    height: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  pathInput: {
    borderRadius: 10,
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 12,
    height: 42,
    paddingHorizontal: 12,
  },
  pathRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.68 },
  screen: { flex: 1 },
  state: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 28,
  },
  stateText: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  viewer: { backgroundColor: "#09090b", flex: 1 },
});
