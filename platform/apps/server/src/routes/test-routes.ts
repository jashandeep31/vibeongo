import { Request, Router, Response } from "express";

const routes: Router = Router();
routes.route("/test").get((req: Request, res: Response) => {
  res.status(200).json({
    message: "route file is working ",
  });
});

export const testRoutes = routes;
