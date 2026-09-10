import dotenv from "dotenv";
import { getForgejoRepo } from "./services/forgejo/repo-actions.js";
import { getForgejoUser } from "./services/forgejo/user-actions.js";
import { db, eq, users } from "@repo/db";
dotenv.config();

export default async function test() {
  // const existingRepo = await getForgejoRepo({
  //   username: "jashandeep31",
  //   reponame: "the-randome",
  // });
  // console.log(existingRepo);
  //
  //
  const user = await getForgejoUser("jashandeep31");
  if (user) {
    console.log(user?.username);
  }

  const allusers = await db.select().from(users);

  for (const user of allusers) {
    console.log(user.forgejo_username, user.forgejo_id);
    // if (user.forgejo_id && user.forgejo_username) {
    //   continue;
    // }
    //
    // const forgejoUser = await getForgejoUser(user.username);
    //
    // if (forgejoUser) {
    //   await db
    //     .update(users)
    //     .set({
    //       forgejo_username: forgejoUser.username,
    //       forgejo_id: forgejoUser.id,
    //     })
    //     .where(eq(users.id, user.id));
    // }
  }
}
