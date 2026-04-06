import { db, eq, projectSessions, projectSessionTasks } from "@repo/db";
import { getRefinedTaskFromUserIssuesComment } from "./ai/ai-functions/get-refined-task-from-user-issues-comment.js";

export default async function test() {
  // const aires = await getRefinedTaskFromUserIssuesComment(
  //   `Repo info: jashandeep31/mailstudio issue: https://github.com/jashandeep31/mailstudio/issues/8
  //     Auth is not prefect here please look in the auth files nad fix the auth files now the user can easily manupuate the id of user.id and can become any user move it to teh jwt based user id stored in the session`,
  // );
  // console.log(aires);
}
