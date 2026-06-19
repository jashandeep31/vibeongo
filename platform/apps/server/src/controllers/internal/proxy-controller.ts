import { db, sql } from "@repo/db";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../lib/app-error.js";
import { env } from "../../lib/env.js";

export const getTargetHostByDomain = catchAsync(
  async (req: Request, res: Response) => {
    const authToken = req.headers.authorization;
    if (authToken !== env.PROXY_SERVER_TOKEN) {
      throw new AppError("unauthorized", 401);
    }

    const { domain } = z
      .object({
        domain: z.string(),
      })
      .parse(req.body);

    const dbRes = await db.execute(sql`SELECT to_jsonb(
  to_jsonb(pd) || jsonb_build_object(
    'routing',
    COALESCE(
      (
        SELECT
          to_jsonb(pdr) || jsonb_build_object(
            'allowed_ips',
            COALESCE(
              (
                SELECT jsonb_agg(to_jsonb(rai))
                FROM routing_allowed_ips rai
                WHERE rai.routing_id = pdr.id
              ),
              '[]'::jsonb
            ),
            'ip',
            COALESCE(
              (
                SELECT instances.public_ip
                FROM instances
                WHERE instances.id = pdr.target_instance_id
              ),
              ''
            )
          )
        FROM project_domain_routing pdr
        WHERE pdr.id = pd.routing_id
        LIMIT 1
      ),
      '{}'::jsonb
    )
  )
)
FROM proxy_domains pd WHERE pd.domain = ${domain};
`);
    const data = dbRes.rows[0]?.to_jsonb;
    if (!data) throw new AppError("domain not found" + domain, 404);
    res.status(200).json({
      data,
    });
  },
);
