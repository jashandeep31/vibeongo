import { create } from "zustand";
import {
  type PortRule,
  createPortRule,
} from "@/app/dashboard/project/create/types";

interface GitRepo {
  id: string;
  git_url: string;
  access_token: string;
  folder_name: string;
  setup_script: string;
}

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
  };
  nvimConfig: {
    enabled: boolean;
    config: string;
  };
}

interface ConfigStore {
  projectName: string;
  setProjectName: (name: string) => void;

  instanceTypeId: string;
  setInstanceTypeId: (id: string) => void;

  instanceRegionId: string;
  setInstanceRegion: (region: string) => void;

  gitRepos: GitRepo[];
  setGitRepos: (repos: GitRepo[]) => void;
  addGitRepo: (rep: GitRepo) => void;
  removeGitRepo: (id: string) => void;

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
  }) => void;
  updateNvimConfig: (nvimConfig: { enabled: boolean; config: string }) => void;

  errors: { message: string }[];
  addError: (error: { message: string }) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  projectName: "Demo project dummy name",
  setProjectName: (name) => set(() => ({ projectName: name })),

  instanceTypeId: "",
  setInstanceTypeId: (id) => set(() => ({ instanceTypeId: id })),

  instanceRegionId: "",
  setInstanceRegion: (region) => set(() => ({ instanceRegionId: region })),

  gitRepos: [],
  setGitRepos: (repos) => set(() => ({ gitRepos: repos })),
  addGitRepo: (rep) => set((state) => ({ gitRepos: [...state.gitRepos, rep] })),
  removeGitRepo: (id) =>
    set((state) => ({
      gitRepos: state.gitRepos.filter((repo) => repo.id !== id),
    })),

  sshKeys: [],
  setSshKeys: (keys) => set(() => ({ sshKeys: keys })),

  portRules: [createPortRule("80"), createPortRule("443")],
  setPortRules: (updater) =>
    set((state) => ({
      portRules:
        typeof updater === "function" ? updater(state.portRules) : updater,
    })),

  additionalServices: {
    dockerConfig: {
      enabled: true,
      containers: [
        {
          id: "9f4749f3-6758-45b7-a74e-d3ac27639e3f",
          name: "PostgreSQL Database",
          content:
            "version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_USER: myuser\n      POSTGRES_PASSWORD: mypassword\n      POSTGRES_DB: mydatabase\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  postgres_data:",
        },
      ],
    },
    opencodeConfig: { enabled: true, authJson: `{"auths":{}}` },
    nvimConfig: {
      enabled: true,
      config: "https://github.com/nvim-lua/kickstart.nvim.git",
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
