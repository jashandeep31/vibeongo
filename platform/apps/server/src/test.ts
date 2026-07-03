import dotenv from "dotenv";
import { createTasksForPRIssueOrCommentAgent } from "./ai/ai-agents/create-tasks-for-pr-issue-or-comment-agent.js";
dotenv.config();

export default async function test() {
  // const res = await createTasksForPRIssueOrCommentAgent(
  //   "comment",
  // "redesign the login page",
  // );
  // for await (const i of projectAIAgent({
  //   query: "list my all the reposl ",
  //   userId: "634c805d-c70a-4333-9214-65d3fafc9481",
  //   QAs: [],
  //   prevConfig: "{}",
  // })) {
  // }
  // const proxyDomain = await db.select().from(proxyDomains);
  //
  // for (const domain of proxyDomain) {
  //   await db
  //     .update(proxyDomains)
  //     .set({
  //       domain: domain.domain.split(".")[0],
  //     })
  //     .where(eq(proxyDomains.id, domain.id));
  // }
}
