import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import path from "node:path";
import fs from "node:fs";

const RootPath = process.cwd();

export const serveBootstrapServer = catchAsync(
  async (_req: Request, res: Response) => {
    const binaryPath = path.join(RootPath, "../../../core/bootstrap-script");

    console.log(binaryPath);

    const stat = fs.statSync(binaryPath);

    res.writeHead(200, {
      "Content-Type": "",
      "Content-Length": stat.size,
    });

    const stream = fs.createReadStream(binaryPath);

    stream.pipe(res);
  },
);
