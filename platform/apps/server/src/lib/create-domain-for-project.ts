import { createId } from "@paralleldrive/cuid2";
import { proxyDomains, Transaction } from "@repo/db";
import { AppError } from "./app-error.js";
import { env } from "./env.js";

// NOTE: this needed to be removed this is for the dev purposes else get it from the env
interface CreateDomainForProjectProps {
  tx: Transaction;
  routingId: string;
  ports: number[];
  userId: string;
}
type Domain = typeof proxyDomains.$inferSelect;

export const createDomainsForProject = async ({
  tx,
  routingId,
  ports,
  userId,
}: CreateDomainForProjectProps): Promise<Domain[]> => {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const values: (typeof proxyDomains.$inferInsert)[] = ports.map((port) => {
        const randomCuid = createId();
        const sub = randomCuid.slice(0, 10);
        return {
          domain: `${sub}.${env.PROXY_DOMAIN}`,
          target_port: port,
          allow_any: true,
          routing_id: routingId,
          user_id: userId,
          is_editable: ![8080, 4096].includes(port),
        };
      });
      const result = await tx.insert(proxyDomains).values(values).returning();
      return result;
    } catch (err: any) {
      console.log(err);
      if (attempt === MAX_RETRIES - 1) {
        throw new AppError(
          "Failed after multiple retries (duplicate domains)",
          500,
        );
      }
    }
  }

  throw new AppError("Failed to create domains", 500);
};
