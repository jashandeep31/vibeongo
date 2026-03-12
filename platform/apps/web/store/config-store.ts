import { create } from "zustand";

interface GitRepo {
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

  gitReps: GitRepo[];
  setGitReps: (repos: GitRepo[]) => void;
  addGitRep: (rep: GitRepo) => void;
  removeGitRep: (index: number) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  projectName: "",
  setProjectName: (name) => set(() => ({ projectName: name })),

  regionId: "",
  setRegionId: (id) => set(() => ({ regionId: id })),

  instanceTypeId: "",
  setInstanceTypeId: (id) => set(() => ({ instanceTypeId: id })),

  gitReps: [],
  setGitReps: (repos) => set(() => ({ gitReps: repos })),
  addGitRep: (rep) => set((state) => ({ gitReps: [...state.gitReps, rep] })),
  removeGitRep: (index) =>
    set((state) => ({ gitReps: state.gitReps.filter((_, i) => i !== index) })),
}));
