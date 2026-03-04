import { userRoles } from "@repo/db";
import { NextFunction, Request, Response } from "express";

type userRole = (typeof userRoles.enumValues)[number];
export const checkAuthorization = (allowedRoles: userRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    next();
  };
};
