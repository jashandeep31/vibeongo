import { create } from "zustand";

interface GitRepo {
  id: string;
  git_url: string;
  access_token: string;
}

interface ConfigStore {
  projectName: string;
  setProjectName: (name: string) => void;

  regionId: string;
  setRegionId: (id: string) => void;

  instanceTypeId: string;
  setInstanceTypeId: (id: string) => void;

  instanceRegion: string;
  setInstanceRegion: (region: string) => void;

  gitRepos: GitRepo[];
  setGitRepos: (repos: GitRepo[]) => void;
  addGitRepo: (rep: GitRepo) => void;
  removeGitRepo: (id: string) => void;

  sshKeys: string[];
  setSshKeys: (keys: string[]) => void;

  errors: { message: string }[];
  addError: (error: { message: string }) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  projectName: "",
  setProjectName: (name) => set(() => ({ projectName: name })),

  regionId: "",
  setRegionId: (id) => set(() => ({ regionId: id })),

  instanceTypeId: "",
  setInstanceTypeId: (id) => set(() => ({ instanceTypeId: id })),

  instanceRegion: "",
  setInstanceRegion: (region) => set(() => ({ instanceRegion: region })),

  gitRepos: [],
  setGitRepos: (repos) => set(() => ({ gitRepos: repos })),
  addGitRepo: (rep) => set((state) => ({ gitRepos: [...state.gitRepos, rep] })),
  removeGitRepo: (id) =>
    set((state) => ({
      gitRepos: state.gitRepos.filter((repo) => repo.id !== id),
    })),

  sshKeys: [],
  setSshKeys: (keys) => set(() => ({ sshKeys: keys })),

  errors: [],
  addError: (error) => set((state) => ({ errors: [...state.errors, error] })),
}));
