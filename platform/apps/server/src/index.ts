import { env } from "./lib/env.js";
import test from "./test.js";
import express from "express";
import cors from "cors";

// app config
const app = express();
app.use(express.json());
app.use(cors());

app.listen(env.PORT, () => {
  console.log(`Server is running at the port ${env.PORT}`);
});

if (env.NODE_ENV === "development") {
  test();
}

// TODO: tasks i wanna do
// 1. create a ec2 by the route hitting of this project
// 2. make ist small vms per the requirements of the user
// 3. install the user setup in it and our own core plugin to handle to make instance a server
