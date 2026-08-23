import dotenv from "dotenv";
import {
  createForgejoUserAccount,
  getAllForgejoUsers,
} from "./services/forgejo/user-actions.js";
import { db, users, eq } from "@repo/db";
import {
  createForgejoRepo,
  getForgejoRepoAccessToken,
} from "./services/forgejo/repo-actions.js";
import { demoReposToFork } from "./utils/constants.js";
import { addDemoProjectsToUserProfile } from "./services/users/add-demo-projects.js";
dotenv.config();

export default async function test() {
  console.log("server in running");
  // const allUsers = await db.select().from(users);
  // console.log(allUsers);
  // const [user] = await db
  //   .select()
  //   .from(users)
  //   .where(eq(users.username, "vibeongo"));
  //
  // console.log(user);
  // if (user) {
  //   console.log(user.username);
  //   // await createForgejoUserAccount(user);
  //   const res = await addDemoProjectsToUserProfile(user);
  //   console.log(res);
  // }
  //
  // const userRows = await db.select().from(users);
  // for (const user of userRows) {
  //   const isusercreatd = (await getAllForgejoUsers("jashandeep31")).length > 0;
  //   if (!isusercreatd) {
  //     await createForgejoUserAccount(user);
  //   }
  // }
  //
  // const allusers = await getAllForgejoUsers("jashandeep31");
  // console.log(allusers);
  // console.log(allusers.length);
  //   const res = await createForgejoRepo({
  //     username: "jashandeep31",
  //     reponame: "test",
  //   });
  //   console.log(res);
  // const res = await getForgejoRepoAccessToken({
  //   username: "jashandeep31",
  //   reponame: "tes",
  // });
  // console.log(res);
}
