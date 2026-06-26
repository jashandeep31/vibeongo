import fs from "node:fs";
import { PROMPT_TEXT_FILES_FOLDER_PATH } from "./index.js";
export const createProjetSystemPrompt = () => {
  return fs.readFileSync(
    PROMPT_TEXT_FILES_FOLDER_PATH + "/create-project-system.txt",
    "utf8",
  );
};
