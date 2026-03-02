import { Request, Router, Response } from "express";
import {
  deleteEc2ServerById,
  getAllRunningEc2s,
} from "../controlers/test-controllers.js";
import { createEc2Instance } from "../aws/services/create-ec2-instance/index.js";

const routes: Router = Router();

routes.route("/servers").get(getAllRunningEc2s).post(createEc2Instance);
routes.route("/servers/:id").delete(deleteEc2ServerById);

// Dev route for the go bootstrap script
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
