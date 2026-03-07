import { expect, test } from "vitest";
import { projectConfigValidator } from "@repo/shared";
import fs from "fs";

const currentDir = import.meta.dirname;
test("Full config pass", () => {
  const files = fs.readdirSync(`${currentDir}/configs`);
  for (const fileName of files) {
    const fileContent = fs.readFileSync(`${currentDir}/configs/${fileName}`, {
      encoding: "utf8",
    });
    const parsedResponse = projectConfigValidator.safeParse(
      JSON.parse(fileContent),
    );
    if (!parsedResponse.success) {
      console.log(JSON.stringify(parsedResponse, null, 2));
    }
    expect(parsedResponse.success).toBe(true);
  }
});
