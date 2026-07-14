import { describe, expect, test } from "vitest";
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

const validConfig = {
  name: "My Project",
  description: "",
  provider: "aws",
  regionId: "123e4567-e89b-12d3-a456-426614174000",
  instanceTypeId: "123e4567-e89b-12d3-a456-426614174001",
  sshKeyIds: [],
  githubRepoIds: [],
  initialScript: "",
  finalScript: "",
  devScript: "",
  config: {
    ports: [{ port: 3000, protocol: "TCP" }],
    packages: [],
  },
};

describe("project config constraints", () => {
  test.each(["", "ab", "a".repeat(21)])(
    "rejects invalid project name %j",
    (name) => {
      expect(
        projectConfigValidator.safeParse({ ...validConfig, name }).success,
      ).toBe(false);
    },
  );

  test.each([0, 65536, 1.5, Number.NaN])("rejects invalid port %s", (port) => {
    expect(
      projectConfigValidator.safeParse({
        ...validConfig,
        config: { ...validConfig.config, ports: [{ port, protocol: "TCP" }] },
      }).success,
    ).toBe(false);
  });

  test.each([1, 3000, 65535])("accepts valid port %s", (port) => {
    expect(
      projectConfigValidator.safeParse({
        ...validConfig,
        config: { ...validConfig.config, ports: [{ port, protocol: "TCP" }] },
      }).success,
    ).toBe(true);
  });
});
