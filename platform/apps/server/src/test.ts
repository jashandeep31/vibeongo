import { db, eq, projectConfig, projects } from "@repo/db";
import { encryptData } from "./lib/encryption-decryption.js";

export default async function test() {
  // const projecRows = await db.select().from(projects);
  // for (const project of projecRows) {
  //   console.log(project.id);
  //   console.log(project.config);
  //
  //   const stringifiedConfig = JSON.stringify(project.config);
  //
  //   const enc = encryptData(stringifiedConfig);
  //
  //   const [isProjectConfigchnaged] = await db
  //     .select()
  //     .from(projectConfig)
  //     .where(eq(projectConfig.project_id, project.id));
  //   if (isProjectConfigchnaged) {
  //     continue;
  //   }
  //
  //   console.log("we need to work");
  //   await db.insert(projectConfig).values({
  //     project_id: project.id,
  //     encrypted_config: enc.encryptedData,
  //     iv: enc.iv,
  //     tag: enc.tag,
  //   });
  // }
}
