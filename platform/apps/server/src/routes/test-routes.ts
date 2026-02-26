import { Request, Router, Response } from "express";

const routes: Router = Router();
routes.route("/test").get((req: Request, res: Response) => {
  res.status(200).json({
    message: "route file is working ",
  });
});

routes
  .route("/postgres-docker-compose-file")
  .get((req: Request, res: Response) => {
    const fileData = `services:
  db:
    image: postgres:18
    restart: always
    volumes:
      - pgdata:/var/lib/postgresql    # <-- FIXED (no /data)
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: default
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: "5"

volumes:
  pgdata:`;
    res.status(200).json({
      message: "postgres docker file is here",
      data: {
        file: fileData,
      },
    });
  });
export const testRoutes = routes;
