import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import path from "node:path";
import fs from "node:fs";

const RootPath = process.cwd();
export const serveBootstrapServer = catchAsync(
  async (req: Request, res: Response) => {
    console.log("the request is here");
    const BinaryPath = path.join(RootPath, "../../../core/tmp/bootstrap");
    res.download(BinaryPath);
  },
);

// const RootPath = process.cwd();
// export const serveBootstrapServer = async () => {
//   const BinaryPath = path.join(RootPath, "../../../core/cmd/bootstrap");
//
//   console.log("serving hte file ");
//
// };
