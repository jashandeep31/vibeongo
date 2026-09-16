import { projects, instances } from "@repo/db";

export type DbInstance = typeof instances.$inferSelect;

export type ProjectConfig = {
  sshKeys?: string[];
  repos?: {
    git_url: string;
    access_token?: string;
    folder_name?: string;
    setup_script?: string;
  }[];
  ports?: {
    port: string;
    protocol: string;
  }[];
  packages?: {
    name: string;
    config?: {
      containers?: {
        name: string;
        dockercomposecode?: string;
      }[];
    };
  }[];
};

export type Project = Omit<typeof projects.$inferSelect, "config"> & {
  config: ProjectConfig;
};
