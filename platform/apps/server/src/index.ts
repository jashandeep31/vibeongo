import { env } from "./lib/env";
import test from "./test";

console.log(`server is running at port ${env.PORT}`);
test();

// TODO: tasks i wanna do
// 1. create a ec2 by the route hitting of this project
// 2. make ist small vms per the requirements of the user
// 3. install the user setup in it and our own core plugin to handle to make instance a server
