import { db, eq, projectSessions, projectSessionTasks } from "@repo/db";

export default async function test() {
  console.log(`Test server in running`);
  const rows = await db
    .select()
    .from(projectSessions)
    .leftJoin(
      projectSessionTasks,
      eq(projectSessionTasks.project_session_id, projectSessions.id),
    );

  // console.log(rows);
}
