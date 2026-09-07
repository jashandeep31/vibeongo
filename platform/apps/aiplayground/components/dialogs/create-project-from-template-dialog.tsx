"use client";

import {
  useCreateProjectFromTemplate,
  useInstanceRegions,
  useInstanceTypes,
  useSandboxRegions,
  useSandboxTypes,
} from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { projectConfigValidator } from "@repo/shared";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

const sandboxProviderOptions = [
  { id: "e2b", label: "E2B" },
  { id: "vercel", label: "Vercel" },
  { id: "daytona", label: "Daytona" },
] as const;

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
  options: readonly { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
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

export function CreateProjectFromTemplateDialog({
  templateId,
  children,
}: {
  templateId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const createProject = useCreateProjectFromTemplate();
  const instanceRegionsQuery = useInstanceRegions();
  const sandboxRegionsQuery = useSandboxRegions();
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [regionId, setRegionId] = useState("");
  const [instanceTypeId, setInstanceTypeId] = useState("");
  const [sandboxProvider, setSandboxProvider] = useState("");
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
    if (!open || regionId || !instanceRegions.length) return;
    setRegionId(instanceRegions[0]?.id ?? "");
  }, [instanceRegions, open, regionId]);

  useEffect(() => {
    if (!open || instanceTypeId || !instanceTypesQuery.data?.length) return;
    setInstanceTypeId(instanceTypesQuery.data[0]?.id ?? "");
  }, [instanceTypeId, instanceTypesQuery.data, open]);

  useEffect(() => {
    if (!open || sandboxProvider) return;
    setSandboxProvider(sandboxProviderOptions[0].id);
  }, [open, sandboxProvider]);

  useEffect(() => {
    if (!open || sandboxRegionId || !sandboxRegions.length) return;
    setSandboxRegionId(sandboxRegions[0]?.id ?? "");
  }, [open, sandboxRegionId, sandboxRegions]);

  useEffect(() => {
    if (!open || sandboxTypeId || !sandboxTypesQuery.data?.length) return;
    setSandboxTypeId(sandboxTypesQuery.data[0]?.id ?? "");
  }, [open, sandboxTypeId, sandboxTypesQuery.data]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && createProject.isPending) return;
    setOpen(nextOpen);
    setError(null);
    if (!nextOpen) {
      setProjectName("");
      setRegionId("");
      setInstanceTypeId("");
      setSandboxProvider("");
      setSandboxRegionId("");
      setSandboxTypeId("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        templateId,
        projectName: parsedName.data,
        regionId,
        instanceTypeId,
        sandboxTypeId,
      });
      toast.success(`${response.data.name} created`);
      handleOpenChange(false);
      router.push("/");
    } catch (requestError) {
      const responseMessage = axios.isAxiosError<{ message?: unknown }>(
        requestError,
      )
        ? requestError.response?.data?.message
        : undefined;
      setError(
        typeof responseMessage === "string"
          ? responseMessage
          : "Could not create this project. Try again.",
      );
    }
  };

  const isMetadataLoading =
    instanceRegionsQuery.isLoading || sandboxRegionsQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create project from template</DialogTitle>
            <DialogDescription>
              Name your project and choose its runtime configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-5">
            <div className="grid gap-2">
              <Label htmlFor={`template-project-name-${templateId}`}>
                Project name
              </Label>
              <Input
                id={`template-project-name-${templateId}`}
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                minLength={3}
                maxLength={20}
                autoFocus
                disabled={createProject.isPending}
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-medium">AWS virtual machine</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  id={`template-region-${templateId}`}
                  label="Region"
                  value={regionId}
                  placeholder="Select a region"
                  disabled={isMetadataLoading || createProject.isPending}
                  options={instanceRegions.map((region) => ({
                    id: region.id,
                    label: `${region.name} (${region.slug})`,
                  }))}
                  onChange={(value) => {
                    setRegionId(value);
                    setInstanceTypeId("");
                  }}
                />
                <SelectField
                  id={`template-instance-type-${templateId}`}
                  label="Machine type"
                  value={instanceTypeId}
                  placeholder="Select a machine type"
                  disabled={
                    !regionId ||
                    instanceTypesQuery.isLoading ||
                    createProject.isPending
                  }
                  options={(instanceTypesQuery.data ?? []).map((type) => ({
                    id: type.id,
                    label: `${type.name} · ${type.cpu || "N/A"} · ${type.ram || "N/A"}`,
                  }))}
                  onChange={setInstanceTypeId}
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium">Sandbox</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField
                  id={`template-sandbox-provider-${templateId}`}
                  label="Provider"
                  value={sandboxProvider}
                  placeholder="Select a provider"
                  disabled={isMetadataLoading || createProject.isPending}
                  options={sandboxProviderOptions}
                  onChange={(value) => {
                    setSandboxProvider(value);
                    setSandboxRegionId("");
                    setSandboxTypeId("");
                  }}
                />
                <SelectField
                  id={`template-sandbox-region-${templateId}`}
                  label="Region"
                  value={sandboxRegionId}
                  placeholder="Select a region"
                  disabled={
                    !sandboxProvider ||
                    sandboxRegionsQuery.isLoading ||
                    createProject.isPending
                  }
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
                  id={`template-sandbox-type-${templateId}`}
                  label="Machine type"
                  value={sandboxTypeId}
                  placeholder="Select a machine type"
                  disabled={
                    !sandboxRegionId ||
                    sandboxTypesQuery.isLoading ||
                    createProject.isPending
                  }
                  options={(sandboxTypesQuery.data ?? []).map((type) => ({
                    id: type.id,
                    label: `${type.name} · ${type.cpu || "N/A"} · ${type.ram || "N/A"}`,
                  }))}
                  onChange={setSandboxTypeId}
                />
              </div>
            </div>

            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={createProject.isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? (
                <Loader2 className="animate-spin" />
              ) : null}
              {createProject.isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
