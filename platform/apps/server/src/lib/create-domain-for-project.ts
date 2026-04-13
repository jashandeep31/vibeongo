import { createId } from "@paralleldrive/cuid2";
import { db, proxyDomains } from "@repo/db";
import { AppError } from "./app-error.js";

const BASE_DOMAIN = "vibeongo.one";
interface CreateDomainForProjectProps {
  projectId: string;
  ports: number[];
}
type Domain = typeof proxyDomains.$inferSelect;

export const createDomainsForProject = async ({
  projectId,
  ports,
}: CreateDomainForProjectProps): Promise<Domain[]> => {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const values: (typeof proxyDomains.$inferInsert)[] = ports.map((port) => {
        const randomCuid = createId();
        const sub = randomCuid.slice(0, 10);
        return {
          domain: `${sub}.${BASE_DOMAIN}`,
          target_port: port,
          allow_any: true,
          project_id: projectId,
        };
      });

      const result = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(proxyDomains)
          .values(values)
          .returning();

        if (!inserted.length) throw new Error("domains not created");
        return inserted;
      });

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
