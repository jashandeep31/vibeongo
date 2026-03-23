import { Router } from "express";
import {
  getIntanceRegions,
  getInstanceTypesByRegion,
} from "../controlers/instance-metadata-controllers.js";

const routes: Router = Router();

routes.route("/regions").get(getIntanceRegions);
routes.route("/regions/:regionId/instance-types").get(getInstanceTypesByRegion);
routes.route("/instance-types/:regionId").get(getInstanceTypesByRegion);

export const instanceMetadataRoutes = routes;
