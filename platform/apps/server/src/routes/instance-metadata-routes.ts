import { Router } from "express";
import { getIntanceRegions } from "../controlers/instance-metadata-controllers.js";

const routes: Router = Router();

routes.route("/regions").get(getIntanceRegions);
export const instanceMetadataRoutes = routes;
