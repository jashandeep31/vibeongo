import dotenv from "dotenv";
import {
  createForgejoUserAccount,
  getAllForgejoUsers,
} from "./services/forgejo/user-actions.js";
import { db, users } from "@repo/db";
import {
  createForgejoRepo,
  getForgejoRepoAccessToken,
} from "./services/forgejo/repo-actions.js";
dotenv.config();

export default async function test() {
  console.log("server in running");

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
  // const res = await getForgejoRepoAccessToken("jashandeep31");
  // console.log(res);
}
