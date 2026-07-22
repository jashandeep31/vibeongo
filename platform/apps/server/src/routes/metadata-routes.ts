import { Router } from "express";
import {
  getInstanceRegions,
  getInstanceTypesByRegion,
  getSandboxRegions,
  getSandboxTypesByRegion,
} from "../controllers/metadata-controllers.js";

const routes: Router = Router();

routes.get("/instances/regions", getInstanceRegions);
routes.get("/instances/regions/:regionId/types", getInstanceTypesByRegion);
routes.get("/sandboxes/regions", getSandboxRegions);
routes.get("/sandboxes/regions/:regionId/types", getSandboxTypesByRegion);

export const metadataRoutes = routes;
