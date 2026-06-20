import { checkAdmin } from "@/lib/get-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import {
  count,
  db,
  desc,
  eq,
  githubRepos,
  instances,
  projectSessions,
  projects,
  users,
} from "@repo/db";
import LogoutButton from "./logout-button";

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatDuration = (
  startedAt: Date | string | null | undefined,
  endedAt: Date | string | null | undefined = new Date(),
) => {
  if (!startedAt || !endedAt) return "-";

  const durationMs =
    new Date(endedAt).getTime() - new Date(startedAt).getTime();

  if (durationMs <= 0) return "0m";

  const totalMinutes = Math.floor(durationMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "-";

const Page = async () => {
  await checkAdmin();

  const [
    totalUsers,
    totalProjects,
    totalGithubRepos,
    activeSessions,
    runningInstancesCount,
    runningInstances,
    recentlyTerminatedInstances,
    adminUsers,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(projects),
    db.select({ value: count() }).from(githubRepos),
    db
      .select({ value: count() })
      .from(projectSessions)
      .where(eq(projectSessions.archived, false)),
    db
      .select({ value: count() })
      .from(instances)
      .where(eq(instances.state, "running")),
    db
      .select({
        id: instances.id,
        name: instances.name,
        publicIp: instances.public_ip,
        awsInstanceId: instances.aws_instance_id,
        sessionCost: instances.session_cost,
        startedAt: instances.started_at,
      })
      .from(instances)
      .where(eq(instances.state, "running"))
      .orderBy(desc(instances.started_at)),
    db
      .select({
        id: instances.id,
        name: instances.name,
        publicIp: instances.public_ip,
        awsInstanceId: instances.aws_instance_id,
        sessionCost: instances.session_cost,
        startedAt: instances.started_at,
        terminatedAt: instances.terminated_at,
      })
      .from(instances)
      .where(eq(instances.state, "terminated"))
      .orderBy(desc(instances.terminated_at))
      .limit(10),
    db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.first_name,
        lastName: users.last_name,
      })
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(desc(users.created_at)),
  ]);

  const metrics = [
    { label: "Total users", value: Number(totalUsers[0]?.value ?? 0) },
    { label: "Total projects", value: Number(totalProjects[0]?.value ?? 0) },
    { label: "GitHub repos", value: Number(totalGithubRepos[0]?.value ?? 0) },
    { label: "Active sessions", value: Number(activeSessions[0]?.value ?? 0) },
    {
      label: "Running instances",
      value: Number(runningInstancesCount[0]?.value ?? 0),
    },
  ];

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Admin</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Platform overview
            </h1>
          </div>
          <LogoutButton />
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-3xl font-semibold">
                  {metric.value.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Running instances</CardTitle>
              <CardDescription>
                Safe instance fields only, no config or private IPs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Public IP</TableHead>
                    <TableHead>AWS ID</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Running for</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runningInstances.length ? (
                    runningInstances.map((instance) => (
                      <TableRow key={instance.id}>
                        <TableCell>{instance.name}</TableCell>
                        <TableCell>{instance.publicIp ?? "-"}</TableCell>
                        <TableCell>{instance.awsInstanceId}</TableCell>
                        <TableCell>{instance.sessionCost}</TableCell>
                        <TableCell>
                          {formatDuration(instance.startedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyRow colSpan={5} label="No running instances" />
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recently terminated instances</CardTitle>
              <CardDescription>
                Last 10 terminated instances with total spun-up time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Public IP</TableHead>
                    <TableHead>AWS ID</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Spun up for</TableHead>
                    <TableHead>Terminated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentlyTerminatedInstances.length ? (
                    recentlyTerminatedInstances.map((instance) => (
                      <TableRow key={instance.id}>
                        <TableCell>{instance.name}</TableCell>
                        <TableCell>{instance.publicIp ?? "-"}</TableCell>
                        <TableCell>{instance.awsInstanceId}</TableCell>
                        <TableCell>{instance.sessionCost}</TableCell>
                        <TableCell>
                          {formatDuration(
                            instance.startedAt,
                            instance.terminatedAt,
                          )}
                        </TableCell>
                        <TableCell>{formatDate(instance.terminatedAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyRow
                      colSpan={6}
                      label="No recently terminated instances"
                    />
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Admin users</CardTitle>
            <CardDescription>
              Admin role accounts with only initials, email, and name.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Initials</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.length ? (
                  adminUsers.map((user) => {
                    const name = [user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <TableRow key={user.id}>
                        <TableCell>{getInitials(name)}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{name || "-"}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <EmptyRow colSpan={3} label="No admin users found" />
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

export default Page;
