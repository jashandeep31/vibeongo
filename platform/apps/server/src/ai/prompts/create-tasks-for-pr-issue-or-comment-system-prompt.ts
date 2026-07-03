import fs from "node:fs";
import { PROMPT_TEXT_FILES_FOLDER_PATH } from "./index.js";
export const createTasksForPRIssueOrCommaentSystemPrompt = () => {
  return fs.readFileSync(
    PROMPT_TEXT_FILES_FOLDER_PATH + "/create-tasks-system-prompt.txt",
    "utf8",
  );
};
