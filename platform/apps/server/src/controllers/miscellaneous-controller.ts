import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import path from "node:path";
import fs from "node:fs";
import { env } from "../lib/env.js";

const RootPath = process.cwd();

const getInstallScript = () => {
  const downloadBinary =
    env.NODE_ENV === "development"
      ? `echo "Installing $APP..."

# Download the binary when running against a development server.
sudo curl -# -L ${env.SERVER_URL}/vibeongo -o "$BINARY_PATH"`
      : `echo "Starting $APP from the pre-installed binary..."`;

  return `#!/usr/bin/env bash
set -euo pipefail

APP="vibeongo"
BINARY_PATH="/usr/local/bin/$APP"

${downloadBinary}

if [[ "$(cat /proc/1/comm)" == "systemd" ]]; then
  sudo tee /etc/systemd/system/vibeongo.service > /dev/null <<EOF
[Unit]
Description=Vibeongo Service
After=network.target

[Service]
Type=simple
User=ubuntu
Environment="HOME=/home/ubuntu"
ExecStart=/usr/local/bin/vibeongo serve
Restart=always
RestartSec=3

Environment=TERM=xterm-256color
Environment=COLORTERM=truecolor
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable vibeongo
  sudo systemctl start vibeongo
else
  nohup sudo dockerd 2>&1 &
  nohup /usr/local/bin/vibeongo serve 2>&1 &
fi`;
};

export const installScript = catchAsync(
  async (_req: Request, res: Response) => {
    res.status(200).type("text/plain").send(getInstallScript());
  },
);

export const serveServer = catchAsync(async (_req: Request, res: Response) => {
  const binaryPath = path.join(RootPath, "../../../core/api");
  const stat = fs.statSync(binaryPath);

  res.writeHead(200, {
    "Content-Type": "",
    "Content-Length": stat.size,
  });

  const stream = fs.createReadStream(binaryPath);

  stream.pipe(res);
});

export const serveVibeongoServer = catchAsync(
  async (_req: Request, res: Response) => {
    const binaryPath = path.join(RootPath, "../../../core/vibeongo");
    const stat = fs.statSync(binaryPath);

    res.writeHead(200, {
      "Content-Type": "",
      "Content-Length": stat.size,
    });

    const stream = fs.createReadStream(binaryPath);

    stream.pipe(res);
  },
);
