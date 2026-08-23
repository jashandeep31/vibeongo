import { projectConfigValidator, type z } from "@repo/shared";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ProjectPackages = z.infer<
  typeof projectConfigValidator
>["config"]["packages"];
type AuthJson = Extract<
  ProjectPackages[number],
  { name: "codex" }
>["config"]["auth_json"];

type DockerContainer = {
  id: string;
  name: string;
  dockercomposecode: string;
};

type AuthConfig = {
  authJson: string;
  useUserConfig: boolean;
};

export type ProjectServicesConfigValue = {
  dockerContainers: DockerContainer[];
  opencode: AuthConfig & { model: string; requirePassword: boolean };
  codex: AuthConfig;
  pi: AuthConfig;
};

const PREDEFINED_CONTAINERS = [
  {
    name: "PostgreSQL Database",
    dockercomposecode: `version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_USER: myuser\n      POSTGRES_PASSWORD: mypassword\n      POSTGRES_DB: mydatabase\n    ports:\n      - "5432:5432"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  postgres_data:`,
  },
  {
    name: "Redis Cache",
    dockercomposecode: `version: '3.8'\nservices:\n  redis:\n    image: redis:7-alpine\n    ports:\n      - "6379:6379"\n    command: redis-server --save 20 1 --loglevel warning\n    volumes:\n      - redis_data:/data\n\nvolumes:\n  redis_data:`,
  },
];

function newContainerId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createDefaultProjectServicesConfig(): ProjectServicesConfigValue {
  return {
    dockerContainers: [],
    opencode: {
      authJson: "",
      useUserConfig: true,
      model: "",
      requirePassword: false,
    },
    codex: { authJson: "", useUserConfig: true },
    pi: { authJson: "", useUserConfig: true },
  };
}

function formatAuthJson(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0
  ) {
    return "";
  }
  return value === undefined ? "" : JSON.stringify(value, null, 2);
}

export function hydrateProjectServicesConfig(
  packages: ProjectPackages,
): ProjectServicesConfigValue {
  const docker = packages.find((item) => item.name === "docker");
  const opencode = packages.find((item) => item.name === "opencode");
  const codex = packages.find((item) => item.name === "codex");
  const pi = packages.find((item) => item.name === "pi");

  return {
    dockerContainers:
      docker?.config.containers.map((container) => ({
        ...container,
        id: newContainerId(),
      })) ?? [],
    opencode: {
      authJson: formatAuthJson(opencode?.config.auth_json),
      useUserConfig: opencode?.config.use_user_config ?? true,
      model: opencode?.config.model ?? "",
      requirePassword: opencode?.config.requirePassword ?? false,
    },
    codex: {
      authJson: formatAuthJson(codex?.config.auth_json),
      useUserConfig: codex?.config.use_user_config ?? true,
    },
    pi: {
      authJson: formatAuthJson(pi?.config.auth_json),
      useUserConfig: pi?.config.use_user_config ?? true,
    },
  };
}

function parseAuthJson(value: string, serviceName: string): AuthJson {
  if (!value.trim()) return {};
  try {
    return JSON.parse(value) as AuthJson;
  } catch {
    throw new Error(`Invalid ${serviceName} auth JSON`);
  }
}

export function buildProjectPackages(
  value: ProjectServicesConfigValue,
): ProjectPackages {
  return [
    {
      name: "docker",
      config: {
        containers: value.dockerContainers.map(
          ({ name, dockercomposecode }) => ({ name, dockercomposecode }),
        ),
      },
    },
    {
      name: "opencode",
      config: {
        auth_json: value.opencode.useUserConfig
          ? {}
          : parseAuthJson(value.opencode.authJson, "OpenCode"),
        use_user_config: value.opencode.useUserConfig,
        model: value.opencode.model,
        requirePassword: value.opencode.requirePassword,
      },
    },
    {
      name: "codex",
      config: {
        auth_json: value.codex.useUserConfig
          ? {}
          : parseAuthJson(value.codex.authJson, "Codex"),
        use_user_config: value.codex.useUserConfig,
      },
    },
    {
      name: "pi",
      config: {
        auth_json: value.pi.useUserConfig
          ? {}
          : parseAuthJson(value.pi.authJson, "Pi"),
        use_user_config: value.pi.useUserConfig,
      },
    },
  ];
}

export function ProjectServicesConfig({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: ProjectServicesConfigValue) => void;
  value: ProjectServicesConfigValue;
}) {
  const theme = useTheme();
  const update = (changes: Partial<ProjectServicesConfigValue>) =>
    onChange({ ...value, ...changes });
  const addContainer = (name: string, dockercomposecode = "") =>
    update({
      dockerContainers: [
        ...value.dockerContainers,
        { id: newContainerId(), name, dockercomposecode },
      ],
    });

  return (
    <View style={styles.cards}>
      <ServiceCard
        icon={{ ios: "shippingbox", android: "deployed_code" }}
        title="Docker"
      >
        {value.dockerContainers.map((container) => (
          <View
            key={container.id}
            style={[
              styles.container,
              { borderColor: theme.backgroundSelected },
            ]}
          >
            <View style={styles.containerHeader}>
              <ConfigInput
                disabled={disabled}
                onChangeText={(name) =>
                  update({
                    dockerContainers: value.dockerContainers.map((item) =>
                      item.id === container.id ? { ...item, name } : item,
                    ),
                  })
                }
                placeholder="Container name"
                value={container.name}
              />
              <Pressable
                accessibilityLabel={`Remove ${container.name}`}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() =>
                  update({
                    dockerContainers: value.dockerContainers.filter(
                      (item) => item.id !== container.id,
                    ),
                  })
                }
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={{ ios: "trash", android: "delete" }}
                  size={17}
                  tintColor="#ef4444"
                />
              </Pressable>
            </View>
            <ConfigInput
              disabled={disabled}
              multiline
              onChangeText={(dockercomposecode) =>
                update({
                  dockerContainers: value.dockerContainers.map((item) =>
                    item.id === container.id
                      ? { ...item, dockercomposecode }
                      : item,
                  ),
                })
              }
              placeholder="docker-compose.yml or Dockerfile code..."
              style={styles.codeInput}
              value={container.dockercomposecode}
            />
          </View>
        ))}
        <View style={styles.chips}>
          <AddChip
            disabled={disabled}
            label="Custom"
            onPress={() => addContainer("Custom Container")}
          />
          {PREDEFINED_CONTAINERS.map((preset) => (
            <AddChip
              disabled={disabled}
              key={preset.name}
              label={preset.name}
              onPress={() =>
                addContainer(preset.name, preset.dockercomposecode)
              }
            />
          ))}
        </View>
      </ServiceCard>

      <ServiceCard
        icon={{ ios: "terminal", android: "terminal" }}
        title="OpenCode"
      >
        <AccountSwitch
          disabled={disabled}
          onValueChange={(useUserConfig) =>
            update({ opencode: { ...value.opencode, useUserConfig } })
          }
          value={value.opencode.useUserConfig}
        />
        <FieldLabel label="AI model">
          <ConfigInput
            disabled={disabled}
            onChangeText={(model) =>
              update({ opencode: { ...value.opencode, model } })
            }
            placeholder="default"
            value={value.opencode.model}
          />
        </FieldLabel>
        <SwitchRow
          disabled={disabled}
          label="Require password"
          onValueChange={(requirePassword) =>
            update({ opencode: { ...value.opencode, requirePassword } })
          }
          value={value.opencode.requirePassword}
        />
        {!value.opencode.useUserConfig ? (
          <AuthJsonField
            disabled={disabled}
            onChangeText={(authJson) =>
              update({ opencode: { ...value.opencode, authJson } })
            }
            serviceName="OpenCode"
            value={value.opencode.authJson}
          />
        ) : null}
      </ServiceCard>

      <ServiceCard
        icon={{ ios: "sparkles", android: "smart_toy" }}
        title="Codex"
      >
        <AccountSwitch
          disabled={disabled}
          onValueChange={(useUserConfig) =>
            update({ codex: { ...value.codex, useUserConfig } })
          }
          value={value.codex.useUserConfig}
        />
        {!value.codex.useUserConfig ? (
          <AuthJsonField
            disabled={disabled}
            onChangeText={(authJson) =>
              update({ codex: { ...value.codex, authJson } })
            }
            serviceName="Codex"
            value={value.codex.authJson}
          />
        ) : null}
      </ServiceCard>

      <ServiceCard
        icon={{ ios: "circle.dotted", android: "radio_button_checked" }}
        title="Pi"
      >
        <AccountSwitch
          disabled={disabled}
          onValueChange={(useUserConfig) =>
            update({ pi: { ...value.pi, useUserConfig } })
          }
          value={value.pi.useUserConfig}
        />
        {!value.pi.useUserConfig ? (
          <AuthJsonField
            disabled={disabled}
            onChangeText={(authJson) =>
              update({ pi: { ...value.pi, authJson } })
            }
            serviceName="Pi"
            value={value.pi.authJson}
          />
        ) : null}
      </ServiceCard>
    </View>
  );
}

function ServiceCard({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: SymbolViewProps["name"];
  title: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { borderColor: theme.backgroundSelected }]}>
      <View style={styles.cardTitleRow}>
        <SymbolView name={icon} size={17} tintColor={theme.textSecondary} />
        <ThemedText style={styles.cardTitle}>{title}</ThemedText>
      </View>
      {children}
    </View>
  );
}

function AccountSwitch(props: {
  disabled: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <SwitchRow {...props} label="Use configuration from account settings" />
  );
}

function SwitchRow({
  disabled,
  label,
  onValueChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.switchRow}>
      <ThemedText style={styles.switchLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      <Switch disabled={disabled} onValueChange={onValueChange} value={value} />
    </View>
  );
}

function AuthJsonField({
  disabled,
  onChangeText,
  serviceName,
  value,
}: {
  disabled: boolean;
  onChangeText: (value: string) => void;
  serviceName: string;
  value: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.authField}>
      <View style={styles.authHeader}>
        <ThemedText style={styles.fieldLabel} themeColor="textSecondary">
          Auth JSON
        </ThemedText>
        <Pressable
          disabled={disabled}
          onPress={() => setRevealed((current) => !current)}
        >
          <ThemedText style={styles.editAuth}>
            {revealed ? "Hide" : value.trim() ? "Edit" : "Add"}
          </ThemedText>
        </Pressable>
      </View>
      {revealed ? (
        <ConfigInput
          accessibilityLabel={`${serviceName} auth JSON`}
          autoCapitalize="none"
          disabled={disabled}
          multiline
          onChangeText={onChangeText}
          placeholder={'{"token": "xyz..."}'}
          style={styles.codeInput}
          value={value}
        />
      ) : null}
    </View>
  );
}

function FieldLabel({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function ConfigInput({
  disabled,
  style,
  ...props
}: Omit<React.ComponentProps<typeof TextInput>, "editable"> & {
  disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <TextInput
      {...props}
      editable={!disabled}
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
          color: theme.text,
        },
        style,
      ]}
      textAlignVertical={props.multiline ? "top" : "center"}
    />
  );
}

function AddChip({
  disabled,
  label,
  onPress,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ ios: "plus", android: "add" }}
        size={13}
        tintColor={theme.textSecondary}
      />
      <ThemedText style={styles.chipLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cards: { gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    padding: 14,
  },
  cardTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  container: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    padding: 10,
  },
  containerHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
  iconButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 34,
  },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeInput: { flex: 0, fontFamily: Fonts.mono, fontSize: 12, minHeight: 110 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    alignItems: "center",
    borderRadius: 9,
    borderStyle: "dashed",
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  chipLabel: { fontSize: 12, fontWeight: "600" },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  switchLabel: { flex: 1, fontSize: 13 },
  authField: { gap: 7 },
  authHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editAuth: { color: "#3b82f6", fontSize: 13, fontWeight: "600" },
  field: { gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.65 },
});
