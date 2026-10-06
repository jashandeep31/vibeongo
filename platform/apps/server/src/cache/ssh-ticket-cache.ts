import { createHash, randomBytes } from "node:crypto";
import { redis } from "../lib/valkey.js";

const TICKET_TTL_SECONDS = 90;

export type SshTicketTarget = {
  userId: string;
  projectSessionId: string;
  instanceId: string;
};

function ticketKey(ticket: string): string {
  const hash = createHash("sha256").update(ticket).digest("hex");
  return `ssh_ticket:${hash}`;
}

export async function createSshTicket(target: SshTicketTarget) {
  const ticket = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TICKET_TTL_SECONDS * 1000);
  const result = await redis.set(
    ticketKey(ticket),
    JSON.stringify(target),
    "EX",
    TICKET_TTL_SECONDS,
    "NX",
  );
  if (result !== "OK") throw new Error("Failed to create SSH ticket");
  return { ticket, expiresAt };
}

export async function consumeSshTicket(
  ticket: string,
): Promise<SshTicketTarget | null> {
  const stored = await redis.getdel(ticketKey(ticket));
  if (!stored) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("userId" in parsed) ||
      !("projectSessionId" in parsed) ||
      !("instanceId" in parsed) ||
      typeof parsed.userId !== "string" ||
      typeof parsed.projectSessionId !== "string" ||
      typeof parsed.instanceId !== "string"
    ) {
      return null;
    }
    return parsed as SshTicketTarget;
  } catch {
    return null;
  }
}
