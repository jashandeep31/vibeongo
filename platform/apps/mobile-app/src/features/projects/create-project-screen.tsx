import { BlurTargetView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { FloatingScreenHeader } from "@/components/floating-screen-header";
import { Radius, Spacing, TouchTarget, type AppColors } from "@/constants/theme";
import { useToast } from "@/contexts/toast-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import {
  createProject,
  getGithubRepoOptions,
  getInstanceRegions,
  getInstanceTypes,
  getProjectConfig,
  getSandboxRegions,
  getSandboxTypes,
  getSshKeyOptions,
  updateProject,
  type GithubRepoOption,
  type InstanceProvider,
  type RuntimeRegion,
  type RuntimeType,
  type SandboxProvider,
  type SandboxRegion,
  type SshKeyOption,
} from "./create-project-api";

type Option = { description?: string; id: string; label: string };
type Picker = {
  onSelect: (id: string) => void;
  options: Option[];
  title: string;
  value: string;
};
type Port = { port: string; protocol: "TCP" | "UDP" };
type DockerContainer = { compose: string; id: string; name: string };

function Field({
  colors,
  label,
  maxLength,
  multiline,
  onChangeText,
  placeholder,
  value,
}: {
  colors: AppColors;
  label: string;
  maxLength?: number;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        maxLength={maxLength}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.brand}
        style={[
          styles.input,
          multiline && styles.textarea,
          { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
  );
}

function SelectField({
  colors,
  disabled,
  label,
  onPress,
  placeholder,
  value,
}: {
  colors: AppColors;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  placeholder: string;
  value?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.select,
          { backgroundColor: colors.input, borderColor: colors.border },
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Text numberOfLines={1} style={[styles.selectText, { color: value ? colors.text : colors.textSecondary }]}>
          {value || placeholder}
        </Text>
        <AppIcon name={{ ios: "chevron.down", android: "expand_more", web: "expand_more" }} size={17} tintColor={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

function Section({
  children,
  colors,
  defaultOpen = false,
  subtitle,
  title,
}: {
  children: ReactNode;
  colors: AppColors;
  defaultOpen?: boolean;
  subtitle: string;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}
      >
        <View style={styles.flex}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
        <AppIcon
          name={open ? { ios: "chevron.up", android: "expand_less", web: "expand_less" } : { ios: "chevron.down", android: "expand_more", web: "expand_more" }}
          size={18}
          tintColor={colors.textSecondary}
        />
      </Pressable>
      {open ? <View style={styles.sectionContent}>{children}</View> : null}
    </View>
  );
}

function Toggle({ colors, label, onValueChange, value }: { colors: AppColors; label: string; onValueChange: (value: boolean) => void; value: boolean }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
      <Switch onValueChange={onValueChange} thumbColor={value ? colors.primaryForeground : colors.surface} trackColor={{ false: colors.backgroundSelected, true: colors.primary }} value={value} />
    </View>
  );
}

function ProviderTabs<T extends string>({ colors, onChange, options, value }: { colors: AppColors; onChange: (value: T) => void; options: Array<{ label: string; value: T }>; value: T }) {
  return (
    <View style={[styles.providerTabs, { backgroundColor: colors.backgroundElement }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.providerTab, selected && { backgroundColor: colors.surface }]}>
            <Text style={[styles.providerText, { color: selected ? colors.text : colors.textSecondary }, selected && styles.providerTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MultiSelectList<T extends { id: string }>({ colors, empty, items, labelFor, onToggle, selected }: { colors: AppColors; empty: string; items: T[]; labelFor: (item: T) => string; onToggle: (id: string) => void; selected: string[] }) {
  if (!items.length) return <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{empty}</Text>;
  return (
    <View style={styles.optionList}>
      {items.map((item) => {
        const checked = selected.includes(item.id);
        return (
          <Pressable key={item.id} onPress={() => onToggle(item.id)} style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}>
            <Text numberOfLines={1} style={[styles.optionText, { color: colors.text }]}>{labelFor(item)}</Text>
            <AppIcon name={checked ? { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" } : { ios: "circle", android: "radio_button_unchecked", web: "radio_button_unchecked" }} size={19} tintColor={checked ? colors.brand : colors.textSecondary} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function CreateProjectScreen() {
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const isEditing = Boolean(projectId);
  const { showToast } = useToast();
  const blurTargetRef = useRef<View>(null);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<InstanceProvider>("aws");
  const [sandboxProvider, setSandboxProvider] = useState<SandboxProvider>("e2b");
  const [regions, setRegions] = useState<RuntimeRegion[]>([]);
  const [sandboxRegions, setSandboxRegions] = useState<SandboxRegion[]>([]);
  const [regionId, setRegionId] = useState("");
  const [instanceTypes, setInstanceTypes] = useState<RuntimeType[]>([]);
  const [instanceTypeId, setInstanceTypeId] = useState("");
  const [sandboxRegionId, setSandboxRegionId] = useState("");
  const [sandboxTypes, setSandboxTypes] = useState<RuntimeType[]>([]);
  const [sandboxTypeId, setSandboxTypeId] = useState("");
  const [repos, setRepos] = useState<GithubRepoOption[]>([]);
  const [sshKeys, setSshKeys] = useState<SshKeyOption[]>([]);
  const [repoIds, setRepoIds] = useState<string[]>([]);
  const [sshKeyIds, setSshKeyIds] = useState<string[]>([]);
  const [initialScript, setInitialScript] = useState("");
  const [finalScript, setFinalScript] = useState("");
  const [devScript, setDevScript] = useState("");
  const [ports, setPorts] = useState<Port[]>([]);
  const [dockerContainers, setDockerContainers] = useState<DockerContainer[]>([]);
  const [openCodeUserConfig, setOpenCodeUserConfig] = useState(true);
  const [openCodeAuth, setOpenCodeAuth] = useState("");
  const [openCodeModel, setOpenCodeModel] = useState("");
  const [openCodePassword, setOpenCodePassword] = useState(false);
  const [codexUserConfig, setCodexUserConfig] = useState(true);
  const [codexAuth, setCodexAuth] = useState("");
  const [piUserConfig, setPiUserConfig] = useState(true);
  const [piAuth, setPiAuth] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingSandboxTypes, setIsLoadingSandboxTypes] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      getInstanceRegions(controller.signal),
      getSandboxRegions(controller.signal),
      getGithubRepoOptions(controller.signal),
      getSshKeyOptions(controller.signal),
      projectId ? getProjectConfig(projectId, controller.signal) : Promise.resolve(null),
    ])
      .then(([nextRegions, nextSandboxRegions, nextRepos, nextKeys, existing]) => {
        setRegions(nextRegions);
        setSandboxRegions(nextSandboxRegions);
        setRepos(nextRepos);
        setSshKeys(nextKeys);
        if (existing) {
          setName(existing.project.name);
          setDescription(existing.project.description ?? "");
          setProvider(existing.provider);
          setRegionId(existing.instanceRegionId ?? "");
          setInstanceTypeId(existing.instanceTypeId);
          const existingSandboxRegion = nextSandboxRegions.find((item) => item.id === existing.sandboxRegionId);
          if (existingSandboxRegion) setSandboxProvider(existingSandboxRegion.provider);
          setSandboxRegionId(existing.sandboxRegionId ?? "");
          setSandboxTypeId(existing.sandboxTypeId ?? "");
          setRepoIds(existing.githubRepoIds);
          setSshKeyIds(existing.sshKeyIds);
          setInitialScript(existing.project.initial_script);
          setFinalScript(existing.project.final_script);
          setDevScript(existing.project.dev_script);
          setPorts(existing.config.ports.map((item) => ({ port: item.port.toString(), protocol: item.protocol })));
          const docker = existing.config.packages.find((item) => item.name === "docker");
          const containers = Array.isArray(docker?.config.containers) ? docker.config.containers : [];
          setDockerContainers(containers.flatMap((item, index) => {
            if (!item || typeof item !== "object") return [];
            const value = item as Record<string, unknown>;
            return [{ compose: typeof value.dockercomposecode === "string" ? value.dockercomposecode : "", id: `existing-${index}`, name: typeof value.name === "string" ? value.name : "" }];
          }));
          const hydrateAgent = (service: string) => existing.config.packages.find((item) => item.name === service)?.config;
          const openCode = hydrateAgent("opencode");
          const codex = hydrateAgent("codex");
          const pi = hydrateAgent("pi");
          const formatAuth = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0 ? "" : value === undefined ? "" : JSON.stringify(value, null, 2);
          setOpenCodeUserConfig(openCode?.use_user_config !== false);
          setOpenCodeAuth(formatAuth(openCode?.auth_json));
          setOpenCodeModel(typeof openCode?.model === "string" ? openCode.model : "");
          setOpenCodePassword(openCode?.requirePassword === true);
          setCodexUserConfig(codex?.use_user_config !== false);
          setCodexAuth(formatAuth(codex?.auth_json));
          setPiUserConfig(pi?.use_user_config !== false);
          setPiAuth(formatAuth(pi?.auth_json));
          return;
        }
        const firstRegion = nextRegions.find((item) => item.provider === "aws") ?? nextRegions[0];
        const firstSandbox = nextSandboxRegions.find((item) => item.provider === "e2b") ?? nextSandboxRegions[0];
        if (firstRegion) { setProvider(firstRegion.provider); setRegionId(firstRegion.id); }
        if (firstSandbox) { setSandboxProvider(firstSandbox.provider); setSandboxRegionId(firstSandbox.id); }
      })
      .catch((error) => {
        if (!controller.signal.aborted) showToast({ message: error instanceof Error ? error.message : "Try again.", title: "Could not load project options", variant: "error" });
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [projectId, showToast]);

  useEffect(() => {
    if (!regionId) return;
    const controller = new AbortController();
    setIsLoadingTypes(true);
    void getInstanceTypes(regionId, controller.signal).then((items) => { setInstanceTypes(items); setInstanceTypeId((current) => items.some((item) => item.id === current) ? current : (items[0]?.id ?? "")); }).catch(() => setInstanceTypes([])).finally(() => { if (!controller.signal.aborted) setIsLoadingTypes(false); });
    return () => controller.abort();
  }, [regionId]);

  useEffect(() => {
    if (!sandboxRegionId) return;
    const controller = new AbortController();
    setIsLoadingSandboxTypes(true);
    void getSandboxTypes(sandboxRegionId, controller.signal).then((items) => { setSandboxTypes(items); setSandboxTypeId((current) => items.some((item) => item.id === current) ? current : (items[0]?.id ?? "")); }).catch(() => setSandboxTypes([])).finally(() => { if (!controller.signal.aborted) setIsLoadingSandboxTypes(false); });
    return () => controller.abort();
  }, [sandboxRegionId]);

  const filteredRegions = useMemo(() => regions.filter((item) => item.provider === provider), [provider, regions]);
  const filteredSandboxRegions = useMemo(() => sandboxRegions.filter((item) => item.provider === sandboxProvider), [sandboxProvider, sandboxRegions]);
  const selectedRegion = regions.find((item) => item.id === regionId);
  const selectedType = instanceTypes.find((item) => item.id === instanceTypeId);
  const selectedSandboxRegion = sandboxRegions.find((item) => item.id === sandboxRegionId);
  const selectedSandboxType = sandboxTypes.find((item) => item.id === sandboxTypeId);
  const toggle = (id: string, values: string[], setter: (values: string[]) => void) => setter(values.includes(id) ? values.filter((item) => item !== id) : [...values, id]);

  const chooseProvider = (next: InstanceProvider) => {
    setProvider(next);
    setRegionId(regions.find((item) => item.provider === next)?.id ?? "");
  };
  const chooseSandboxProvider = (next: SandboxProvider) => {
    setSandboxProvider(next);
    setSandboxRegionId(sandboxRegions.find((item) => item.provider === next)?.id ?? "");
  };
  const openPicker = (title: string, options: Option[], value: string, onSelect: (id: string) => void) => setPicker({ title, options, value, onSelect });

  const parseAuth = (raw: string, service: string) => {
    if (!raw.trim()) return {};
    try { return JSON.parse(raw) as unknown; } catch { throw new Error(`${service} authentication must be valid JSON.`); }
  };

  const submit = async () => {
    if (name.trim().length < 3 || name.trim().length > 20) {
      showToast({ message: "Use between 3 and 20 characters.", title: "Invalid project name", variant: "error" });
      return;
    }
    if (!regionId || !instanceTypeId || !sandboxTypeId) {
      showToast({ message: "Select a VM region, VM size, and sandbox size.", title: "Runtime is incomplete", variant: "error" });
      return;
    }
    const normalizedPorts = ports.map((item) => ({ port: Number(item.port), protocol: item.protocol }));
    if (normalizedPorts.some((item) => !Number.isInteger(item.port) || item.port < 1 || item.port > 65535)) {
      showToast({ message: "Ports must be whole numbers from 1 to 65535.", title: "Invalid port", variant: "error" });
      return;
    }
    let openCodeAuthJson: unknown;
    let codexAuthJson: unknown;
    let piAuthJson: unknown;
    try {
      openCodeAuthJson = openCodeUserConfig ? {} : parseAuth(openCodeAuth, "OpenCode");
      codexAuthJson = codexUserConfig ? {} : parseAuth(codexAuth, "Codex");
      piAuthJson = piUserConfig ? {} : parseAuth(piAuth, "Pi");
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : "Check authentication JSON.", title: "Invalid configuration", variant: "error" });
      return;
    }

    setIsCreating(true);
    const payload = {
      name: name.trim(), description: description.trim(), provider, regionId, instanceTypeId, sandboxTypeId,
      githubRepoIds: repoIds, sshKeyIds, initialScript, finalScript, devScript,
      config: {
        ports: normalizedPorts,
        packages: [
          { name: "docker", config: { containers: dockerContainers.map((item) => ({ name: item.name, dockercomposecode: item.compose })) } },
          { name: "opencode", config: { auth_json: openCodeAuthJson, use_user_config: openCodeUserConfig, model: openCodeModel, requirePassword: openCodePassword } },
          { name: "codex", config: { auth_json: codexAuthJson, use_user_config: codexUserConfig } },
          { name: "pi", config: { auth_json: piAuthJson, use_user_config: piUserConfig } },
        ],
      },
    };
    try {
      if (projectId) await updateProject(projectId, payload);
      else await createProject(payload);
      showToast({ message: isEditing ? `${name.trim()} was updated.` : `${name.trim()} is ready with a default session.`, title: isEditing ? "Project saved" : "Project created", variant: "success" });
      router.replace({ pathname: "/", params: { refresh: Date.now().toString(), tab: "projects" } } as never);
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : "Please try again.", title: isEditing ? "Could not save project" : "Could not create project", variant: "error" });
    } finally { setIsCreating(false); }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
          <BlurTargetView ref={blurTargetRef} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.intro, { color: colors.textSecondary }]}>Configure the runtimes, source access, and tools used by every session in this project.</Text>

              <Section colors={colors} defaultOpen subtitle="Name and description" title="Project details">
                <Field colors={colors} label="Name" maxLength={20} onChangeText={setName} placeholder="My project" value={name} />
                <Field colors={colors} label="Description" multiline onChangeText={setDescription} placeholder="What is this project for?" value={description} />
              </Section>

              <Section colors={colors} defaultOpen subtitle="Virtual machine and sandbox" title="Runtime">
                <Text style={[styles.subheading, { color: colors.text }]}>Virtual machine</Text>
                <ProviderTabs colors={colors} onChange={chooseProvider} options={[{ label: "AWS", value: "aws" }, { label: "DigitalOcean", value: "digitalocean" }]} value={provider} />
                <SelectField colors={colors} disabled={isLoading} label="Region" onPress={() => openPicker("VM region", filteredRegions.map((item) => ({ id: item.id, label: item.name, description: item.slug })), regionId, setRegionId)} placeholder="Select region" value={selectedRegion ? `${selectedRegion.name} (${selectedRegion.slug})` : undefined} />
                <SelectField colors={colors} disabled={isLoadingTypes || !regionId} label="Machine type" onPress={() => openPicker("VM machine type", instanceTypes.map((item) => ({ id: item.id, label: item.name, description: [item.cpu, item.ram].filter(Boolean).join(" · ") })), instanceTypeId, setInstanceTypeId)} placeholder={isLoadingTypes ? "Loading…" : "Select machine"} value={selectedType ? `${selectedType.name}${selectedType.cpu ? ` · ${selectedType.cpu}` : ""}${selectedType.ram ? ` · ${selectedType.ram}` : ""}` : undefined} />

                <Text style={[styles.subheading, { color: colors.text }]}>Sandbox</Text>
                <ProviderTabs colors={colors} onChange={chooseSandboxProvider} options={[{ label: "E2B", value: "e2b" }, { label: "Vercel", value: "vercel" }, { label: "Daytona", value: "daytona" }]} value={sandboxProvider} />
                <SelectField colors={colors} disabled={isLoading} label="Region" onPress={() => openPicker("Sandbox region", filteredSandboxRegions.map((item) => ({ id: item.id, label: item.name, description: item.slug })), sandboxRegionId, setSandboxRegionId)} placeholder="Select region" value={selectedSandboxRegion ? `${selectedSandboxRegion.name} (${selectedSandboxRegion.slug})` : undefined} />
                <SelectField colors={colors} disabled={isLoadingSandboxTypes || !sandboxRegionId} label="Machine type" onPress={() => openPicker("Sandbox machine type", sandboxTypes.map((item) => ({ id: item.id, label: item.name, description: [item.cpu, item.ram].filter(Boolean).join(" · ") })), sandboxTypeId, setSandboxTypeId)} placeholder={isLoadingSandboxTypes ? "Loading…" : "Select machine"} value={selectedSandboxType ? `${selectedSandboxType.name}${selectedSandboxType.cpu ? ` · ${selectedSandboxType.cpu}` : ""}${selectedSandboxType.ram ? ` · ${selectedSandboxType.ram}` : ""}` : undefined} />
              </Section>

              <Section colors={colors} subtitle="Repositories and SSH keys" title="Source and access">
                <Text style={[styles.subheading, { color: colors.text }]}>GitHub repositories</Text>
                <MultiSelectList colors={colors} empty="No repositories connected." items={repos} labelFor={(item) => item.full_name} onToggle={(id) => toggle(id, repoIds, setRepoIds)} selected={repoIds} />
                <Text style={[styles.subheading, { color: colors.text }]}>SSH keys</Text>
                <MultiSelectList colors={colors} empty="No SSH keys added." items={sshKeys} labelFor={(item) => item.name} onToggle={(id) => toggle(id, sshKeyIds, setSshKeyIds)} selected={sshKeyIds} />
              </Section>

              <Section colors={colors} subtitle="Setup and development commands" title="Scripts">
                <Field colors={colors} label="Initial script" maxLength={500} multiline onChangeText={setInitialScript} placeholder="Runs before repositories are set up" value={initialScript} />
                <Field colors={colors} label="Final script" maxLength={500} multiline onChangeText={setFinalScript} placeholder="Runs after repositories are set up" value={finalScript} />
                <Field colors={colors} label="Development script" maxLength={500} multiline onChangeText={setDevScript} placeholder="Starts the development environment" value={devScript} />
              </Section>

              <Section colors={colors} subtitle="Exposed TCP and UDP ports" title="Ports">
                {ports.map((item, index) => (
                  <View key={`${index}-${item.protocol}`} style={styles.inlineRow}>
                    <TextInput inputMode="numeric" onChangeText={(value) => setPorts((current) => current.map((port, itemIndex) => itemIndex === index ? { ...port, port: value } : port))} placeholder="3000" placeholderTextColor={colors.textSecondary} style={[styles.compactInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} value={item.port} />
                    <Pressable onPress={() => setPorts((current) => current.map((port, itemIndex) => itemIndex === index ? { ...port, protocol: port.protocol === "TCP" ? "UDP" : "TCP" } : port))} style={[styles.protocolButton, { backgroundColor: colors.backgroundElement }]}><Text style={[styles.protocolText, { color: colors.text }]}>{item.protocol}</Text></Pressable>
                    <Pressable accessibilityLabel="Remove port" onPress={() => setPorts((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.iconButton}><AppIcon name={{ ios: "xmark", android: "close", web: "close" }} size={17} tintColor={colors.destructive} /></Pressable>
                  </View>
                ))}
                <Pressable onPress={() => setPorts((current) => [...current, { port: "", protocol: "TCP" }])} style={styles.textAction}><Text style={[styles.textActionLabel, { color: colors.brand }]}>+ Add port</Text></Pressable>
              </Section>

              <Section colors={colors} subtitle="Docker and coding-agent configuration" title="Additional services">
                <Text style={[styles.subheading, { color: colors.text }]}>Docker containers</Text>
                {dockerContainers.map((container) => (
                  <View key={container.id} style={[styles.nestedGroup, { backgroundColor: colors.backgroundElement }]}>
                    <Field colors={colors} label="Container name" onChangeText={(value) => setDockerContainers((current) => current.map((item) => item.id === container.id ? { ...item, name: value } : item))} placeholder="PostgreSQL" value={container.name} />
                    <Field colors={colors} label="Docker Compose" multiline onChangeText={(value) => setDockerContainers((current) => current.map((item) => item.id === container.id ? { ...item, compose: value } : item))} placeholder="services: ..." value={container.compose} />
                    <Pressable onPress={() => setDockerContainers((current) => current.filter((item) => item.id !== container.id))} style={styles.textAction}><Text style={[styles.textActionLabel, { color: colors.destructive }]}>Remove container</Text></Pressable>
                  </View>
                ))}
                <Pressable onPress={() => setDockerContainers((current) => [...current, { compose: "", id: `${Date.now()}-${current.length}`, name: "" }])} style={styles.textAction}><Text style={[styles.textActionLabel, { color: colors.brand }]}>+ Add container</Text></Pressable>

                <Text style={[styles.subheading, { color: colors.text }]}>OpenCode</Text>
                <Toggle colors={colors} label="Use account configuration" onValueChange={setOpenCodeUserConfig} value={openCodeUserConfig} />
                {!openCodeUserConfig ? <Field colors={colors} label="Authentication JSON" multiline onChangeText={setOpenCodeAuth} placeholder="{}" value={openCodeAuth} /> : null}
                <Field colors={colors} label="Default model" onChangeText={setOpenCodeModel} placeholder="default" value={openCodeModel} />
                <Toggle colors={colors} label="Require password" onValueChange={setOpenCodePassword} value={openCodePassword} />

                <Text style={[styles.subheading, { color: colors.text }]}>Codex</Text>
                <Toggle colors={colors} label="Use account configuration" onValueChange={setCodexUserConfig} value={codexUserConfig} />
                {!codexUserConfig ? <Field colors={colors} label="Authentication JSON" multiline onChangeText={setCodexAuth} placeholder="{}" value={codexAuth} /> : null}

                <Text style={[styles.subheading, { color: colors.text }]}>Pi</Text>
                <Toggle colors={colors} label="Use account configuration" onValueChange={setPiUserConfig} value={piUserConfig} />
                {!piUserConfig ? <Field colors={colors} label="Authentication JSON" multiline onChangeText={setPiAuth} placeholder="{}" value={piAuth} /> : null}
              </Section>

              <Pressable disabled={isCreating || isLoading} onPress={() => void submit()} style={[styles.createButton, { backgroundColor: colors.primary }, (isCreating || isLoading) && styles.disabled]}>
                {isCreating ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.createButtonText, { color: colors.primaryForeground }]}>{isEditing ? "Save changes" : "Create project"}</Text>}
              </Pressable>
            </ScrollView>
          </BlurTargetView>
          <FloatingScreenHeader blurTarget={blurTargetRef} colors={colors} colorScheme={colorScheme} onBack={() => router.back()} title={isEditing ? "Edit project" : "Create project"} />
        </KeyboardAvoidingView>
      </SafeAreaView>
      <OptionSheet colors={colors} onClose={() => setPicker(null)} picker={picker} />
    </View>
  );
}

function OptionSheet({ colors, onClose, picker }: { colors: AppColors; onClose: () => void; picker: Picker | null }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={Boolean(picker)}>
      <View style={[styles.modalRoot, { backgroundColor: colors.overlay }]}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={["bottom"]} style={[styles.optionSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.optionSheetHeader}>
            <Text style={[styles.optionSheetTitle, { color: colors.text }]}>{picker?.title}</Text>
            <Pressable onPress={onClose} style={styles.iconButton}><AppIcon name={{ ios: "xmark", android: "close", web: "close" }} size={18} tintColor={colors.textSecondary} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.optionSheetContent}>
            {picker?.options.map((option) => {
              const selected = picker.value === option.id;
              return (
                <Pressable key={option.id} onPress={() => { picker.onSelect(option.id); onClose(); }} style={({ pressed }) => [styles.pickerRow, pressed && styles.pressed]}>
                  <View style={styles.flex}><Text style={[styles.optionText, { color: colors.text }]}>{option.label}</Text>{option.description ? <Text style={[styles.pickerDescription, { color: colors.textSecondary }]}>{option.description}</Text> : null}</View>
                  {selected ? <AppIcon name={{ ios: "checkmark", android: "check", web: "check" }} size={18} tintColor={colors.brand} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, safeArea: { flex: 1 }, flex: { flex: 1 },
  content: { alignSelf: "center", gap: Spacing.five, maxWidth: 760, paddingBottom: Spacing.ten, paddingHorizontal: Spacing.five, paddingTop: 68, width: "100%" },
  intro: { fontSize: 12, lineHeight: 18 },
  section: { paddingVertical: Spacing.two },
  sectionHeader: { alignItems: "center", flexDirection: "row", minHeight: 56 },
  sectionTitle: { fontSize: 15, fontWeight: "700" }, sectionSubtitle: { fontSize: 11, marginTop: 3 },
  sectionContent: { gap: Spacing.four, paddingBottom: Spacing.four, paddingTop: Spacing.three },
  field: { gap: 6 }, label: { fontSize: 11, fontWeight: "600" },
  input: { borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, fontSize: 14, minHeight: 48, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  textarea: { minHeight: 96 },
  select: { alignItems: "center", borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", height: 48, paddingHorizontal: Spacing.four },
  selectText: { flex: 1, fontSize: 13 },
  subheading: { fontSize: 13, fontWeight: "700", marginTop: Spacing.two },
  providerTabs: { borderRadius: Radius.pill, flexDirection: "row", padding: 4 }, providerTab: { alignItems: "center", borderRadius: Radius.pill, flex: 1, height: 36, justifyContent: "center" }, providerText: { fontSize: 11, fontWeight: "500" }, providerTextSelected: { fontWeight: "700" },
  optionList: { gap: 2 }, optionRow: { alignItems: "center", flexDirection: "row", minHeight: TouchTarget }, optionText: { flex: 1, fontSize: 13, fontWeight: "500" }, emptyText: { fontSize: 12, paddingVertical: Spacing.two },
  toggleRow: { alignItems: "center", flexDirection: "row", minHeight: TouchTarget }, toggleLabel: { flex: 1, fontSize: 13, fontWeight: "500" },
  inlineRow: { alignItems: "center", flexDirection: "row", gap: Spacing.two }, compactInput: { borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, flex: 1, fontSize: 13, height: 44, paddingHorizontal: Spacing.three }, protocolButton: { alignItems: "center", borderRadius: Radius.medium, height: 44, justifyContent: "center", width: 64 }, protocolText: { fontSize: 11, fontWeight: "700" }, iconButton: { alignItems: "center", height: TouchTarget, justifyContent: "center", width: TouchTarget },
  textAction: { alignSelf: "flex-start", justifyContent: "center", minHeight: 38 }, textActionLabel: { fontSize: 12, fontWeight: "700" },
  nestedGroup: { borderRadius: Radius.medium, gap: Spacing.three, padding: Spacing.four },
  createButton: { alignItems: "center", borderRadius: Radius.pill, height: 50, justifyContent: "center", marginTop: Spacing.four }, createButtonText: { fontSize: 14, fontWeight: "700" },
  modalRoot: { flex: 1, justifyContent: "flex-end" }, optionSheet: { borderTopLeftRadius: Radius.large, borderTopRightRadius: Radius.large, maxHeight: "70%" }, optionSheetHeader: { alignItems: "center", flexDirection: "row", height: 60, justifyContent: "space-between", paddingHorizontal: Spacing.five }, optionSheetTitle: { fontSize: 16, fontWeight: "700" }, optionSheetContent: { paddingBottom: Spacing.five, paddingHorizontal: Spacing.five }, pickerRow: { alignItems: "center", flexDirection: "row", minHeight: 58 }, pickerDescription: { fontSize: 11, marginTop: 3 },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.55 },
});
