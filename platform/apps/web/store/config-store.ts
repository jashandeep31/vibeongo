import { create } from "zustand";
import { type PortRule } from "@/app/dashboard/project/create/types";
import { type ProjectProvider } from "@repo/shared";

interface ContainerConfig {
  id: string;
  name: string;
  dockercomposecode: string;
}
interface AdditionalService {
  dockerConfig: {
    containers: ContainerConfig[];
  };
  opencodeConfig: {
    authJson: string;
    model: string;
    requirePassword: boolean;
  };
  codexConfig: {
    authJson: string;
  };
  piConfig: {
    authJson: string;
  };
  nvimConfig: {
    config: string;
  };
}

export interface ProjectConfigSubmissionError {
  id: string;
  message: string;
  source: "validation" | "server";
}

interface ConfigStore {
  projectName: string;
  setProjectName: (name: string) => void;

  provider: ProjectProvider;
  setProvider: (provider: ProjectProvider) => void;

  initialScript: string;
  setInitialScript: (script: string) => void;
  finalScript: string;
  setFinalScript: (script: string) => void;

  devScript: string;
  setDevScript: (script: string) => void;

  instanceTypeId: string;
  setInstanceTypeId: (id: string) => void;

  sandboxTypeId: string;
  setSandboxTypeId: (id: string) => void;

  sandboxRegionId: string;
  setSandboxRegionId: (id: string) => void;

  instanceRegionId: string;
  setInstanceRegion: (region: string) => void;

  gitRepoIds: string[];
  setGitRepoIds: (ids: string[]) => void;
  toggleGitRepoId: (id: string) => void;

  sshKeys: string[];
  setSshKeys: (keys: string[]) => void;

  portRules: PortRule[];
  setPortRules: (
    updater: PortRule[] | ((currentRules: PortRule[]) => PortRule[]),
  ) => void;

  additionalServices: AdditionalService;
  updateDockerConfig: (dockerConfig: { containers: ContainerConfig[] }) => void;
  updateOpencodeConfig: (opencodeConfig: {
    authJson: string;
    model: string;
    requirePassword: boolean;
  }) => void;
  updateCodexConfig: (codexConfig: { authJson: string }) => void;
  updatePiConfig: (piConfig: { authJson: string }) => void;
  updateNvimConfig: (nvimConfig: { config: string }) => void;

  submissionErrors: ProjectConfigSubmissionError[];
  hasAttemptedSubmit: boolean;
  setSubmissionErrors: (errors: ProjectConfigSubmissionError[]) => void;
  setHasAttemptedSubmit: (hasAttempted: boolean) => void;
  resetSubmissionErrors: () => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  setProjectName: (name) => set(() => ({ projectName: name })),
  projectName: "",

  provider: "aws",
  setProvider: (provider) =>
    set((state) => ({
      provider,
      instanceRegionId:
        state.provider === provider ? state.instanceRegionId : "",
      instanceTypeId: state.provider === provider ? state.instanceTypeId : "",
    })),

  initialScript: "",
  setInitialScript: (script) => set(() => ({ initialScript: script })),

  finalScript: "",
  setFinalScript: (script) => set(() => ({ finalScript: script })),

  devScript: "",
  setDevScript: (script) => set(() => ({ devScript: script })),
  instanceTypeId: "",
  setInstanceTypeId: (id) => set(() => ({ instanceTypeId: id })),

  sandboxTypeId: "",
  setSandboxTypeId: (id) => set(() => ({ sandboxTypeId: id })),

  sandboxRegionId: "",
  setSandboxRegionId: (id) => set(() => ({ sandboxRegionId: id })),

  instanceRegionId: "",
  setInstanceRegion: (region) => set(() => ({ instanceRegionId: region })),

  gitRepoIds: [],
  setGitRepoIds: (ids) => set(() => ({ gitRepoIds: ids })),
  toggleGitRepoId: (id) =>
    set((state) => ({
      gitRepoIds: state.gitRepoIds.includes(id)
        ? state.gitRepoIds.filter((repoId) => repoId !== id)
        : [...state.gitRepoIds, id],
    })),

  sshKeys: [],
  setSshKeys: (keys) => set(() => ({ sshKeys: keys })),

  portRules: [],
  setPortRules: (updater) =>
    set((state) => ({
      portRules:
        typeof updater === "function" ? updater(state.portRules) : updater,
    })),

  additionalServices: {
    dockerConfig: {
      containers: [
        // {
        //   id: "9f4749f3-6758-45b7-a74e-d3ac27639e3f",
        //   name: "PostgreSQL Database",
        //   dockercomposecode:
        //     "version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_USER: myuser\n      POSTGRES_PASSWORD: mypassword\n      POSTGRES_DB: mydatabase\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  postgres_data:",
        // },
      ],
    },
    opencodeConfig: {
      authJson: ``,
      model: "",
      requirePassword: false,
    },
    codexConfig: {
      authJson: "",
    },
    piConfig: {
      authJson: "",
    },
    nvimConfig: {
      config: "",
    },
  },

  updateDockerConfig: (dockerConfig) =>
    set((state) => ({
      additionalServices: { ...state.additionalServices, dockerConfig },
    })),

  updateOpencodeConfig: (opencodeConfig) =>
    set((state) => ({
      additionalServices: { ...state.additionalServices, opencodeConfig },
    })),

  updateCodexConfig: (codexConfig) =>
    set((state) => ({
      additionalServices: { ...state.additionalServices, codexConfig },
    })),

  updatePiConfig: (piConfig) =>
    set((state) => ({
      additionalServices: { ...state.additionalServices, piConfig },
    })),

  updateNvimConfig: (nvimConfig) =>
    set((state) => ({
      additionalServices: { ...state.additionalServices, nvimConfig },
    })),

  submissionErrors: [],
  hasAttemptedSubmit: false,
  setSubmissionErrors: (submissionErrors) => set({ submissionErrors }),
  setHasAttemptedSubmit: (hasAttemptedSubmit) => set({ hasAttemptedSubmit }),
  resetSubmissionErrors: () =>
    set({ submissionErrors: [], hasAttemptedSubmit: false }),
}));
