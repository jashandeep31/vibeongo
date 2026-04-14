import { db, eq, sql } from "@repo/db";
import { catchAsync } from "../../lib/catch-async.js";
import { Request, Response } from "express";
import { z } from "zod";

export const getTargetHostByDomain = catchAsync(
  async (req: Request, res: Response) => {
    const { domain } = z
      .object({
        domain: z.string(),
      })
      .parse(req.body);

    const dbRes = await db.execute(sql`
SELECT to_jsonb(
           to_jsonb(pd) || jsonb_build_object(
               'routing',
               coalesce(
                   (SELECT to_jsonb(
                               to_jsonb(pdr) || jsonb_build_object(
                                   'allowed_domains',
                                   coalesce(
                                       (SELECT jsonb_agg(to_jsonb(rai))
                                        FROM routing_allowed_ips rai
                                        WHERE rai.routing_id = pdr.id),
                                       '[]'::jsonb
                                   )
                                                )
                           )
                    FROM project_domain_routing pdr
                    WHERE pdr.id = pd.routing_id  limit 1) ,
                   '{}'::jsonb
               )
                           )
       )
FROM proxy_domains pd
WHERE pd.domain = ${domain};
`);

    console.log(dbRes);
    res.status(200).json({
      data: dbRes.rows[0]?.to_jsonb,
    });
  },
);
