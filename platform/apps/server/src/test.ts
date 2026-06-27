import { projectAIAgent } from "./ai/ai-agents/project-agent.js";

export default async function test() {
  console.log("test is working");

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
