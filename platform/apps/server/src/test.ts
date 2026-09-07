import dotenv from "dotenv";
import {
  createForgejoUserAccount,
  getAllForgejoUsers,
} from "./services/forgejo/user-actions.js";
import { db, users, eq } from "@repo/db";
import { getForgejoRepo } from "./services/forgejo/repo-actions.js";
dotenv.config();

export default async function test() {
  // const existingRepo = await getForgejoRepo({
  //   username: "jashandeep31",
  //   reponame: "the-randome",
  // });
  // console.log(existingRepo);
}
