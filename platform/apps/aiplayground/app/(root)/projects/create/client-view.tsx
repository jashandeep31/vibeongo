"use client";

import { SshKeyDialog } from "@/components/dialogs/ssh-key-dialog";
import { GithubRepoDialog } from "@/components/dialogs/github-repo-dialog";
import {
  buildProjectPackages,
  createDefaultProjectServicesConfig,
  hydrateProjectServicesConfig,
  ProjectServicesConfig,
} from "@/components/project-services-config";
import {
  useInstanceRegions,
  useInstanceTypes,
  useSandboxRegions,
  useSandboxTypes,
} from "@/hooks/use-project-metadata";
import {
  useCreateProject,
  useGetGithubRepos,
  useGetProjectConfigForEdit,
  useUpdateProject,
} from "@/hooks/use-project";
import { useSshKeys } from "@/hooks/use-ssh-keys";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Textarea } from "@repo/ui/components/textarea";
import {
  projectConfigValidator,
  type ProjectProvider,
  type z,
} from "@repo/shared";
import axios from "axios";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Github,
  KeyRound,
  Loader2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

type ProjectPorts = z.infer<typeof projectConfigValidator>["config"]["ports"];
type SandboxProvider = "e2b" | "vercel";

const sandboxProviderOptions: { id: SandboxProvider; label: string }[] = [
  { id: "e2b", label: "E2B" },
  { id: "vercel", label: "Vercel" },
];

const isAvailableSandboxProvider = (
  provider: string,
): provider is SandboxProvider => provider === "e2b" || provider === "vercel";

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="py-7 first:pt-0">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

function SelectField({
  id,
  label,
  value,
  placeholder,
  disabled,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <NativeSelectOption value="">{placeholder}</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.id} value={option.id}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export default function ClientView({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const projectConfigQuery = useGetProjectConfigForEdit(projectId ?? null);
  const instanceRegionsQuery = useInstanceRegions();
  const sandboxRegionsQuery = useSandboxRegions();
  const reposQuery = useGetGithubRepos();
  const sshKeysQuery = useSshKeys();
  const isEditing = Boolean(projectId);
  const isSaving = createProject.isPending || updateProject.isPending;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<ProjectProvider>("aws");
  const [instanceRegionId, setInstanceRegionId] = useState("");
  const [instanceTypeId, setInstanceTypeId] = useState("");
  const [sandboxProvider, setSandboxProvider] =
    useState<SandboxProvider>("e2b");
  const [sandboxRegionId, setSandboxRegionId] = useState("");
  const [sandboxTypeId, setSandboxTypeId] = useState("");
  const [githubRepoIds, setGithubRepoIds] = useState<string[]>([]);
  const [sshKeyIds, setSshKeyIds] = useState<string[]>([]);
  const [initialScript, setInitialScript] = useState("");
  const [finalScript, setFinalScript] = useState("");
  const [devScript, setDevScript] = useState("");
  const [servicesConfig, setServicesConfig] = useState(
    createDefaultProjectServicesConfig,
  );
  const [ports, setPorts] = useState<ProjectPorts>([]);
  const [hydratedProjectId, setHydratedProjectId] = useState<string | null>(
    null,
  );
  const [errors, setErrors] = useState<string[]>([]);

  const instanceRegions = useMemo(
    () =>
      (instanceRegionsQuery.data ?? []).filter(
        (region) => region.provider === provider,
      ),
    [instanceRegionsQuery.data, provider],
  );
  const sandboxRegions = useMemo(
    () =>
      (sandboxRegionsQuery.data ?? []).filter(
        (region) => region.provider === sandboxProvider,
      ),
    [sandboxProvider, sandboxRegionsQuery.data],
  );
  const instanceTypesQuery = useInstanceTypes(instanceRegionId);
  const sandboxTypesQuery = useSandboxTypes(sandboxRegionId);
  const instanceTypes = useMemo(
    () => instanceTypesQuery.data ?? [],
    [instanceTypesQuery.data],
  );
  const sandboxTypes = useMemo(
    () => sandboxTypesQuery.data ?? [],
    [sandboxTypesQuery.data],
  );

  useEffect(() => {
    const projectConfig = projectConfigQuery.data;
    if (!projectConfig || hydratedProjectId === projectConfig.project.id) {
      return;
    }

    setName(projectConfig.project.name);
    setDescription(projectConfig.project.description ?? "");
    setProvider(projectConfig.provider);
    setInstanceRegionId(projectConfig.instanceRegionId ?? "");
    setInstanceTypeId(projectConfig.instanceTypeId);
    setSandboxRegionId(projectConfig.sandboxRegionId ?? "");
    setSandboxTypeId(projectConfig.sandboxTypeId);
    setGithubRepoIds(projectConfig.githubRepoIds);
    setSshKeyIds(projectConfig.sshKeyIds);
    setInitialScript(projectConfig.project.initial_script);
    setFinalScript(projectConfig.project.final_script);
    setDevScript(projectConfig.project.dev_script);
    setServicesConfig(
      hydrateProjectServicesConfig(projectConfig.config.packages),
    );
    setPorts(projectConfig.config.ports);
    setHydratedProjectId(projectConfig.project.id);
  }, [hydratedProjectId, projectConfigQuery.data]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    if (!instanceRegions.length) return;
    if (instanceRegions.some((region) => region.id === instanceRegionId)) {
      return;
    }
    setInstanceRegionId(instanceRegions[0]?.id ?? "");
    setInstanceTypeId("");
  }, [
    hydratedProjectId,
    instanceRegionId,
    instanceRegions,
    isEditing,
    projectId,
  ]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    if (!instanceTypes.length) return;
    if (instanceTypes.some((type) => type.id === instanceTypeId)) return;
    setInstanceTypeId(instanceTypes[0]?.id ?? "");
  }, [hydratedProjectId, instanceTypeId, instanceTypes, isEditing, projectId]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    const selectedRegion = sandboxRegionsQuery.data?.find(
      (region) => region.id === sandboxRegionId,
    );
    if (
      selectedRegion &&
      isAvailableSandboxProvider(selectedRegion.provider) &&
      selectedRegion.provider !== sandboxProvider
    ) {
      setSandboxProvider(selectedRegion.provider);
      return;
    }
  }, [
    hydratedProjectId,
    isEditing,
    projectId,
    sandboxProvider,
    sandboxRegionId,
    sandboxRegionsQuery.data,
  ]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    if (!sandboxRegions.length) return;
    if (sandboxRegions.some((region) => region.id === sandboxRegionId)) return;

    const selectedRegion = sandboxRegionsQuery.data?.find(
      (region) => region.id === sandboxRegionId,
    );
    if (
      selectedRegion &&
      isAvailableSandboxProvider(selectedRegion.provider)
    ) {
      return;
    }

    setSandboxRegionId(sandboxRegions[0]?.id ?? "");
    setSandboxTypeId("");
  }, [
    hydratedProjectId,
    isEditing,
    projectId,
    sandboxRegionId,
    sandboxRegions,
    sandboxRegionsQuery.data,
  ]);

  useEffect(() => {
    if (isEditing && hydratedProjectId !== projectId) return;
    if (!sandboxTypes.length) return;
    if (sandboxTypes.some((type) => type.id === sandboxTypeId)) return;
    setSandboxTypeId(sandboxTypes[0]?.id ?? "");
  }, [hydratedProjectId, isEditing, projectId, sandboxTypeId, sandboxTypes]);

  const toggleValue = (
    value: string,
    selectedValues: string[],
    setSelectedValues: (values: string[]) => void,
  ) => {
    setSelectedValues(
      selectedValues.includes(value)
        ? selectedValues.filter((selected) => selected !== value)
        : [...selectedValues, value],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let packages;
    try {
      packages = buildProjectPackages(servicesConfig);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid service configuration";
      setErrors([message]);
      toast.error(message);
      return;
    }

    const payload = {
      name,
      description,
      provider,
      regionId: instanceRegionId,
      instanceTypeId,
      sandboxTypeId,
      sshKeyIds,
      githubRepoIds,
      initialScript,
      finalScript,
      devScript,
      config: {
        ports,
        packages,
      },
    };

    const validation = projectConfigValidator.safeParse(payload);
    if (!validation.success) {
      const messages = Array.from(
        new Set(validation.error.issues.map((issue) => issue.message)),
      );
      setErrors(messages);
      toast.error("Please fix the project configuration errors");
      return;
    }

    setErrors([]);
    const toastId = toast.loading(
      isEditing ? "Saving project" : "Creating project",
    );
    try {
      if (projectId) {
        await updateProject.mutateAsync({
          id: projectId,
          projectData: validation.data,
        });
      } else {
        await createProject.mutateAsync(validation.data);
      }
      toast.success(isEditing ? "Project saved" : "Project created", {
        id: toastId,
      });
      router.push("/");
    } catch (error) {
      const message = getErrorMessage(
        error,
        isEditing
          ? "Project changes could not be saved."
          : "Project could not be created.",
      );
      setErrors([message]);
      toast.error(
        isEditing
          ? "Project changes could not be saved"
          : "Project could not be created",
        { id: toastId },
      );
    }
  };

  if (
    isEditing &&
    (projectConfigQuery.isLoading ||
      (projectConfigQuery.data && hydratedProjectId !== projectId))
  ) {
    return (
      <div className="text-muted-foreground mx-auto w-full max-w-6xl px-5 py-12 text-sm sm:px-8">
        <Loader2 className="mr-2 inline size-4 animate-spin" />
        Loading project...
      </div>
    );
  }

  if (isEditing && (projectConfigQuery.isError || !projectConfigQuery.data)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Project could not be loaded</AlertTitle>
          <AlertDescription>Try refreshing the page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/">
          <ArrowLeft />
          Back to projects
        </Link>
      </Button>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {isEditing ? "Edit project" : "Create project"}
        </h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="[&_[data-slot=input]]:border-foreground/25 [&_[data-slot=native-select]]:border-foreground/25 [&_[data-slot=textarea]]:border-foreground/25 dark:[&_[data-slot=input]]:border-foreground/30 dark:[&_[data-slot=native-select]]:border-foreground/30 dark:[&_[data-slot=textarea]]:border-foreground/30 mt-8"
      >
        <FormSection title="Project details">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My project"
              minLength={3}
              maxLength={20}
              autoFocus
              disabled={isSaving}
            />
          </div>
        </FormSection>

        <FormSection title="Runtime">
          <div>
            <p className="text-sm font-medium">Virtual machine</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <SelectField
                id="instance-region"
                label="Region"
                value={instanceRegionId}
                placeholder={
                  instanceRegionsQuery.isLoading
                    ? "Loading regions..."
                    : "Select a region"
                }
                disabled={instanceRegionsQuery.isLoading || isSaving}
                options={instanceRegions.map((region) => ({
                  id: region.id,
                  label: `${region.name} (${region.slug})`,
                }))}
                onChange={(value) => {
                  setInstanceRegionId(value);
                  setInstanceTypeId("");
                }}
              />
              <SelectField
                id="instance-type"
                label="Machine type"
                value={instanceTypeId}
                placeholder={
                  instanceTypesQuery.isLoading
                    ? "Loading machine types..."
                    : "Select a machine type"
                }
                disabled={
                  !instanceRegionId || instanceTypesQuery.isLoading || isSaving
                }
                options={instanceTypes.map((type) => ({
                  id: type.id,
                  label: `${type.name} · ${type.cpu || "N/A"} · ${type.ram || "N/A"}`,
                }))}
                onChange={setInstanceTypeId}
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium">Sandbox</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <SelectField
                id="sandbox-provider"
                label="Provider"
                value={sandboxProvider}
                placeholder="Select a provider"
                disabled={sandboxRegionsQuery.isLoading || isSaving}
                options={sandboxProviderOptions}
                onChange={(value) => {
                  if (!isAvailableSandboxProvider(value)) return;
                  setSandboxProvider(value);
                  setSandboxRegionId("");
                  setSandboxTypeId("");
                }}
              />
              <SelectField
                id="sandbox-region"
                label="Region"
                value={sandboxRegionId}
                placeholder={
                  sandboxRegionsQuery.isLoading
                    ? "Loading regions..."
                    : "Select a region"
                }
                disabled={sandboxRegionsQuery.isLoading || isSaving}
                options={sandboxRegions.map((region) => ({
                  id: region.id,
                  label: `${region.name} (${region.slug})`,
                }))}
                onChange={(value) => {
                  setSandboxRegionId(value);
                  setSandboxTypeId("");
                }}
              />
              <SelectField
                id="sandbox-type"
                label="Machine type"
                value={sandboxTypeId}
                placeholder={
                  sandboxTypesQuery.isLoading
                    ? "Loading machine types..."
                    : "Select a machine type"
                }
                disabled={
                  !sandboxRegionId || sandboxTypesQuery.isLoading || isSaving
                }
                options={sandboxTypes.map((type) => ({
                  id: type.id,
                  label: `${type.name} · ${type.cpu || "N/A"} · ${type.ram || "N/A"}`,
                }))}
                onChange={setSandboxTypeId}
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Source and access">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Github className="text-muted-foreground size-4" />
                <Label>GitHub repositories</Label>
              </div>
              <GithubRepoDialog>
                <Button type="button" variant="outline" size="sm">
                  <Plus />
                  Add repository
                </Button>
              </GithubRepoDialog>
            </div>
            {reposQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">
                Loading repositories...
              </p>
            ) : reposQuery.isError ? (
              <p className="text-destructive text-sm">
                Repositories could not be loaded.
              </p>
            ) : reposQuery.data?.length ? (
              <div className="flex flex-wrap gap-2">
                {reposQuery.data.map((repo) => {
                  const selected = githubRepoIds.includes(repo.id);
                  return (
                    <Button
                      key={repo.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={selected}
                      disabled={isSaving}
                      onClick={() =>
                        toggleValue(repo.id, githubRepoIds, setGithubRepoIds)
                      }
                      className={
                        selected
                          ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                          : ""
                      }
                    >
                      {selected ? <Check /> : <Github />}
                      {repo.full_name}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No repositories connected.
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="text-muted-foreground size-4" />
                <Label>SSH keys</Label>
              </div>
              <SshKeyDialog>
                <Button type="button" variant="outline" size="sm">
                  <Plus />
                  Add key
                </Button>
              </SshKeyDialog>
            </div>
            {sshKeysQuery.isLoading ? (
              <p className="text-muted-foreground text-sm">
                Loading SSH keys...
              </p>
            ) : sshKeysQuery.isError ? (
              <p className="text-destructive text-sm">
                SSH keys could not be loaded.
              </p>
            ) : sshKeysQuery.data?.length ? (
              <div className="flex flex-wrap gap-2">
                {sshKeysQuery.data.map((sshKey) => {
                  const selected = sshKeyIds.includes(sshKey.id);
                  return (
                    <Button
                      key={sshKey.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={selected}
                      disabled={isSaving}
                      onClick={() =>
                        toggleValue(sshKey.id, sshKeyIds, setSshKeyIds)
                      }
                      className={
                        selected
                          ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                          : ""
                      }
                    >
                      {selected ? <Check /> : <KeyRound />}
                      {sshKey.name}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No SSH keys added.
              </p>
            )}
          </div>
        </FormSection>

        <FormSection title="Advanced settings">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="initial-script">Initial script</Label>
              <Textarea
                id="initial-script"
                value={initialScript}
                onChange={(event) => setInitialScript(event.target.value)}
                placeholder="Runs before repositories are set up"
                maxLength={500}
                className="min-h-24 font-mono text-xs"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="final-script">Final script</Label>
              <Textarea
                id="final-script"
                value={finalScript}
                onChange={(event) => setFinalScript(event.target.value)}
                placeholder="Runs after repositories are set up"
                maxLength={500}
                className="min-h-24 font-mono text-xs"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dev-script">Development script</Label>
              <Textarea
                id="dev-script"
                value={devScript}
                onChange={(event) => setDevScript(event.target.value)}
                placeholder="Starts the development environment"
                maxLength={500}
                className="min-h-24 font-mono text-xs"
                disabled={isSaving}
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Additional services">
          <ProjectServicesConfig
            value={servicesConfig}
            disabled={isSaving}
            onChange={setServicesConfig}
          />
        </FormSection>

        {errors.length ? (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle />
            <AlertTitle>
              Fix the following before {isEditing ? "saving" : "creating"}
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild type="button" variant="outline" disabled={isSaving}>
            <Link href="/">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="animate-spin" />
            ) : isEditing ? (
              <Check />
            ) : (
              <Plus />
            )}
            {isSaving
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save changes"
                : "Create project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
