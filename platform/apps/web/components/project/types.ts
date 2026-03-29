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
    enabled: boolean;
    config?: {
      containers?: {
        name: string;
      }[];
    };
  }[];
};

export type Project = Omit<typeof projects.$inferSelect, "config"> & {
  config: ProjectConfig;
};
