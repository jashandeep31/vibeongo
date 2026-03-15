import { projects, instances } from "@repo/db";
import { projectConfigValidator, z } from "@repo/shared";

export type DbProject = typeof projects.$inferSelect;
export type DbInstance = typeof instances.$inferSelect;

export type ProjectConfig = z.infer<typeof projectConfigValidator>["config"];

export type Project = Omit<DbProject, "config"> & {
  config: ProjectConfig;
};

export type ProjectData = {
  project: Project;
  instances: DbInstance[];
};
