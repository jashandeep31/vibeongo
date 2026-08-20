import dotenv from "dotenv";
import { env } from "./lib/env.js";
dotenv.config();

export default async function test() {
  console.log("server in running");
  console.log(env.DATABASE_URL);
}
