import { expect, test } from "vitest";
import { projectConfigValidator, z } from "@repo/shared";
test("Full config pass", () => {
  const config = {};
  const parsedResponse = projectConfigValidator.safeParse(config);
  expect(parsedResponse.error).toBe(null);
});
