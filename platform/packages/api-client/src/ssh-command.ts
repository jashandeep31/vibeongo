import type { CreateSshTicketResponse } from "./services/ssh-ticket-services.js";

export function formatSshCommand({
  username,
  host,
  port,
}: Pick<CreateSshTicketResponse, "username" | "host" | "port">): string {
  const portOption = port === 22 ? "" : ` -p ${port}`;
  return `ssh${portOption} ${username}@${host}`;
}
