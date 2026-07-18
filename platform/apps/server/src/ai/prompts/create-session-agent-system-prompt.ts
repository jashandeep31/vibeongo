import fs from "node:fs";
import { PROMPT_TEXT_FILES_FOLDER_PATH } from "./index.js";

export const createProjectSessionAgentSystemPrompt = () => {
  return fs.readFileSync(
    PROMPT_TEXT_FILES_FOLDER_PATH + "/create-session-agent-system-prompt.txt",
    "utf8",
  );
};
