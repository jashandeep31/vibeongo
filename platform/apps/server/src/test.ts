import { db, eq, projectSessions, projectSesssionTasks } from "@repo/db";

export default async function test() {
  console.log(`Test server in running`);
  const rows = await db
    .select()
    .from(projectSessions)
    .leftJoin(
      projectSesssionTasks,
      eq(projectSesssionTasks.project_session_id, projectSessions.id),
    );

  // console.log(rows);
}
