import { Request, Router, Response } from "express";
import {
  createEc2Server,
  deleteEc2ServerById,
  getAllRunningEc2s,
} from "../controlers/test-controllers.js";

const routes: Router = Router();

routes.route("/servers").get(getAllRunningEc2s).post(createEc2Server);
routes.route("/servers/:id").delete(deleteEc2ServerById);

// Dev route for the go bootstrap script
routes
  .route("/postgres-docker-compose-file")
  .get((_req: Request, res: Response) => {
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

routes.route("/config").get((req: Request, res: Response) => {
  res.status(200).json({
    sshKeys: [],
    ports: [
      {
        port: 80,
        protocol: "TCP",
      },
      {
        port: 443,
        protocol: "TCP",
      },
    ],
    repos: [
      {
        git_url: "https://github.com/jashandeep31/mailstudio.git",
        access_token: "",
      },
    ],
    packages: [
      {
        name: "docker",
        enabled: true,
        config: {
          containers: [
            {
              name: "PostgreSQL Database",
              content:
                "version: '3.8'\nservices:\n  postgres:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_USER: myuser\n      POSTGRES_PASSWORD: mypassword\n      POSTGRES_DB: mydatabase\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  postgres_data:",
            },
          ],
        },
      },
      {
        name: "opencode",
        enabled: true,
        config: {
          auth_json: {
            google: {
              type: "api",
              key: "Please change the key from the google api console its leaked due to comment push ",
            },
          },
        },
      },
      {
        name: "nvim",
        enabled: true,
        config: {
          config_url: "https://github.com/nvim-lua/kickstart.nvim.git",
        },
      },
    ],
  });
});
export const testRoutes = routes;
