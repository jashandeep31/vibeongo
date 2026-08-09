import fs from "node:fs";
import { PROMPT_TEXT_FILES_FOLDER_PATH } from "./index.js";

export const vibeongoSystemPrompt = () => {
  return fs.readFileSync(
    PROMPT_TEXT_FILES_FOLDER_PATH + "/vibeongo-system-prompt.txt",
    "utf8",
  );
};
