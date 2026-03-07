import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // ...
    projects: [
      {
        test: {
          root: "./tests",
        },
      },
    ],
  },
});
