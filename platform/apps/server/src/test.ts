import dotenv from "dotenv";
dotenv.config();
import { Sandbox } from "e2b";
import { env } from "./lib/env.js";
import axios from "axios";

const futureTime = new Date();

// 2. Add 5 minutes to the current time
futureTime.setMinutes(futureTime.getMinutes() + 5);

export default async function test() {
  console.log("server in running");
}
