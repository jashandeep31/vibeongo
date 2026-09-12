import dotenv from "dotenv";
import { getForgejoUserById } from "./services/forgejo/user-actions.js";
import { db, users } from "@repo/db";
dotenv.config();

export default async function test() {
  // const existingRepo = await getForgejoRepo({
  //   username: "jashandeep31",
  //   reponame: "the-randome",
  // });
  // console.log(existingRepo);
  //
  //
  const allusers = await db.select().from(users);

  for (const user of allusers) {
    if (user.forgejo_id === null) continue;
    console.log(await getForgejoUserById(user.forgejo_id));
  }
}
