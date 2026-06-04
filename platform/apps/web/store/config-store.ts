import { create } from "zustand";
import {
  type PortRule,
  createPortRule,
} from "@/app/dashboard/project/create/types";

interface ContainerConfig {
  id: string;
  name: string;
  content: string;
}
interface AdditionalService {
  dockerConfig: {
    enabled: boolean;
    containers: ContainerConfig[];
  };
  opencodeConfig: {
    enabled: boolean;
    authJson: string;
    model: string;
  };
  nvimConfig: {
    enabled: boolean;
    config: string;
  };
}

interface ConfigStore {
  projectName: string;
  setProjectName: (name: string) => void;

  initialScript: string;
  setInitialScript: (script: string) => void;
  finalScript: string;
  setFinalScript: (script: string) => void;

  instanceTypeId: string;
  setInstanceTypeId: (id: string) => void;

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
  updateDockerConfig: (dockerConfig: {
    enabled: boolean;
    containers: ContainerConfig[];
  }) => void;
  updateOpencodeConfig: (opencodeConfig: {
    enabled: boolean;
    authJson: string;
    model: string;
  }) => void;
  updateNvimConfig: (nvimConfig: { enabled: boolean; config: string }) => void;

  errors: { message: string }[];
  addError: (error: { message: string }) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  setProjectName: (name) => set(() => ({ projectName: name })),
  projectName: "",

  initialScript: "#!/bin/bash\n#add from here",
  setInitialScript: (script) => set(() => ({ initialScript: script })),

  finalScript: "#!/bin/bash\n#add from here",
  setFinalScript: (script) => set(() => ({ finalScript: script })),
  instanceTypeId: "",
  setInstanceTypeId: (id) => set(() => ({ instanceTypeId: id })),

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
      enabled: false,
      containers: [
        // {
        //   id: "9f4749f3-6758-45b7-a74e-d3ac27639e3f",
        //   name: "PostgreSQL Database",
        //   content:
        //     "version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_USER: myuser\n      POSTGRES_PASSWORD: mypassword\n      POSTGRES_DB: mydatabase\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  postgres_data:",
        // },
      ],
    },
    opencodeConfig: {
      enabled: true,
      authJson: ``,
      model: "",
    },
    nvimConfig: {
      enabled: false,
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

  updateNvimConfig: (nvimConfig) =>
    set((state) => ({
      additionalServices: { ...state.additionalServices, nvimConfig },
    })),

  errors: [],
  addError: (error) => set((state) => ({ errors: [...state.errors, error] })),
}));
