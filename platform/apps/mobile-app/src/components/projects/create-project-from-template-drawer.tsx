import type { ProjectTemplate } from "@repo/api-client";
import {
  useCreateProjectFromTemplate,
  useInstanceRegions,
  useInstanceTypes,
  useSandboxRegions,
  useSandboxTypes,
} from "@repo/api-hooks";
import { projectConfigValidator } from "@repo/shared";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ChoiceField, type Choice } from "@/components/choice-field";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

const sandboxProviderOptions: Choice[] = [
  { id: "e2b", label: "E2B" },
  { id: "vercel", label: "Vercel" },
  { id: "daytona", label: "Daytona" },
];

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }
  return "Could not create this project. Try again.";
}

export function CreateProjectFromTemplateDrawer({
  onClose,
  template,
}: {
  onClose: () => void;
  template: ProjectTemplate | null;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const nameInputRef = useRef<TextInput>(null);
  const createProject = useCreateProjectFromTemplate();
  const instanceRegionsQuery = useInstanceRegions();
  const sandboxRegionsQuery = useSandboxRegions();
  const [projectName, setProjectName] = useState("");
  const [regionId, setRegionId] = useState("");
  const [instanceTypeId, setInstanceTypeId] = useState("");
  const [sandboxProvider, setSandboxProvider] = useState("e2b");
  const [sandboxRegionId, setSandboxRegionId] = useState("");
  const [sandboxTypeId, setSandboxTypeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const instanceRegions = useMemo(
    () =>
      (instanceRegionsQuery.data ?? []).filter(
        (region) => region.provider === "aws",
      ),
    [instanceRegionsQuery.data],
  );
  const sandboxRegions = useMemo(
    () =>
      (sandboxRegionsQuery.data ?? []).filter(
        (region) => region.provider === sandboxProvider,
      ),
    [sandboxProvider, sandboxRegionsQuery.data],
  );
  const instanceTypesQuery = useInstanceTypes(regionId);
  const sandboxTypesQuery = useSandboxTypes(sandboxRegionId);

  useEffect(() => {
    if (!template) return;
    const timer = setTimeout(() => nameInputRef.current?.focus(), 220);
    return () => clearTimeout(timer);
  }, [template]);

  useEffect(() => {
    if (!template || regionId || !instanceRegions.length) return;
    setRegionId(instanceRegions[0]?.id ?? "");
  }, [instanceRegions, regionId, template]);

  useEffect(() => {
    if (!template || instanceTypeId || !instanceTypesQuery.data?.length) return;
    setInstanceTypeId(instanceTypesQuery.data[0]?.id ?? "");
  }, [instanceTypeId, instanceTypesQuery.data, template]);

  useEffect(() => {
    if (!template || sandboxRegionId || !sandboxRegions.length) return;
    setSandboxRegionId(sandboxRegions[0]?.id ?? "");
  }, [sandboxRegionId, sandboxRegions, template]);

  useEffect(() => {
    if (!template || sandboxTypeId || !sandboxTypesQuery.data?.length) return;
    setSandboxTypeId(sandboxTypesQuery.data[0]?.id ?? "");
  }, [sandboxTypeId, sandboxTypesQuery.data, template]);

  const resetAndClose = () => {
    setProjectName("");
    setRegionId("");
    setInstanceTypeId("");
    setSandboxProvider("e2b");
    setSandboxRegionId("");
    setSandboxTypeId("");
    setError(null);
    onClose();
  };

  const close = () => {
    if (!createProject.isPending) resetAndClose();
  };

  const submit = async () => {
    if (!template || createProject.isPending) return;
    const parsedName = projectConfigValidator.shape.name.safeParse(projectName);
    if (!parsedName.success) {
      setError(
        parsedName.error.issues[0]?.message ?? "Check the project name.",
      );
      return;
    }
    if (!regionId || !instanceTypeId || !sandboxTypeId) {
      setError("Select an AWS region, machine type, and sandbox type.");
      return;
    }

    setError(null);
    try {
      const response = await createProject.mutateAsync({
        templateId: template.id,
        projectName: parsedName.data,
        regionId,
        instanceTypeId,
        sandboxTypeId,
      });
      Toast.show({
        type: "success",
        text1: `${response.data.name} created`,
        text2: "The project is ready on your home screen.",
      });
      resetAndClose();
      router.replace({ pathname: "/", params: { view: "projects" } });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const isPending = createProject.isPending;

  return (
    <Modal
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={Boolean(template)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.root}
      >
        <Pressable
          accessibilityLabel="Close project creation"
          accessibilityRole="button"
          onPress={close}
          style={styles.backdrop}
        />
        <BottomDrawerPanel
          accessibilityViewIsModal
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          visible={Boolean(template)}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={styles.title}>Create from template</ThemedText>
            <ThemedText style={styles.templateName} themeColor="textSecondary">
              {template?.name}
            </ThemedText>

            <View style={styles.fields}>
              <View style={styles.field}>
                <ThemedText style={styles.label} themeColor="textSecondary">
                  Project name
                </ThemedText>
                <TextInput
                  editable={!isPending}
                  maxLength={20}
                  onChangeText={setProjectName}
                  placeholder="My project"
                  placeholderTextColor={theme.textSecondary}
                  ref={nameInputRef}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={projectName}
                />
              </View>

              <ThemedText style={styles.sectionTitle}>
                AWS virtual machine
              </ThemedText>
              <ChoiceField
                disabled={instanceRegionsQuery.isPending || isPending}
                label="Region"
                onChange={(id) => {
                  setRegionId(id);
                  setInstanceTypeId("");
                }}
                options={instanceRegions.map((region) => ({
                  id: region.id,
                  label: `${region.name} (${region.slug})`,
                }))}
                placeholder="Select a region"
                value={regionId}
              />
              <ChoiceField
                disabled={
                  !regionId || instanceTypesQuery.isPending || isPending
                }
                label="Machine type"
                onChange={setInstanceTypeId}
                options={(instanceTypesQuery.data ?? []).map((type) => ({
                  id: type.id,
                  label: `${type.name} · ${type.cpu || "N/A"} · ${type.ram || "N/A"}`,
                }))}
                placeholder="Select a machine type"
                value={instanceTypeId}
              />

              <ThemedText style={styles.sectionTitle}>Sandbox</ThemedText>
              <ChoiceField
                disabled={isPending}
                label="Provider"
                onChange={(id) => {
                  setSandboxProvider(id);
                  setSandboxRegionId("");
                  setSandboxTypeId("");
                }}
                options={sandboxProviderOptions}
                placeholder="Select a provider"
                value={sandboxProvider}
              />
              <ChoiceField
                disabled={sandboxRegionsQuery.isPending || isPending}
                label="Region"
                onChange={(id) => {
                  setSandboxRegionId(id);
                  setSandboxTypeId("");
                }}
                options={sandboxRegions.map((region) => ({
                  id: region.id,
                  label: `${region.name} (${region.slug})`,
                }))}
                placeholder="Select a region"
                value={sandboxRegionId}
              />
              <ChoiceField
                disabled={
                  !sandboxRegionId || sandboxTypesQuery.isPending || isPending
                }
                label="Machine type"
                onChange={setSandboxTypeId}
                options={(sandboxTypesQuery.data ?? []).map((type) => ({
                  id: type.id,
                  label: `${type.name} · ${type.cpu || "N/A"} · ${type.ram || "N/A"}`,
                }))}
                placeholder="Select a machine type"
                value={sandboxTypeId}
              />
            </View>

            {error ? (
              <ThemedText style={styles.error}>{error}</ThemedText>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={isPending}
                onPress={close}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.actionLabel}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isPending}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.text },
                  isPending && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {isPending ? (
                  <ActivityIndicator color={theme.background} size="small" />
                ) : (
                  <ThemedText
                    style={[styles.actionLabel, { color: theme.background }]}
                  >
                    Create project
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </BottomDrawerPanel>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  drawer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 18,
    width: 38,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  templateName: { fontSize: 13, marginTop: 3 },
  fields: { gap: 16, marginTop: 22 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "600" },
  input: {
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: 6 },
  error: { color: "#ef4444", fontSize: 13, lineHeight: 19, marginTop: 16 },
  actions: { flexDirection: "row", gap: 10, paddingTop: 24 },
  action: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  actionLabel: { fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.65 },
});
