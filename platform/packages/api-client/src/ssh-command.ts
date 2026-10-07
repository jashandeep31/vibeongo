export function formatSshCommand({
  username,
  host,
  port,
}: {
  username: string;
  host: string;
  port: number;
}): string {
  const portOption = port === 22 ? "" : ` -p ${port}`;
  return `ssh${portOption} ${username}@${host}`;
}
