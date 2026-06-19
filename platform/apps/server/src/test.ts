import { decryptData, encryptData } from "./lib/encrytion-decryption.js";

export default async function test() {
  const userdata = JSON.stringify({
    name: "jashan",
    age: 22,
  });
  const enc = encryptData(userdata);
  console.log(enc);

  const decrypt = decryptData(enc);
  console.log(decrypt);
}
