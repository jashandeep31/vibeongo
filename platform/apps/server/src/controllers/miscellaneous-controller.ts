import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import path from "node:path";
import fs from "node:fs";

const RootPath = process.cwd();

export const installScript = catchAsync(
  async (_req: Request, res: Response) => {
    res.status(200).type("text/plain").send(`
#!/usr/bin/env bash
set -euo pipefail

APP="vibeongo"
BINARY_PATH="/usr/local/bin/$APP"

echo "Installing $APP..."

# Download binary
sudo curl -# -L  https://download.vibeongo.com/vibeongo -o "$BINARY_PATH"

# Make executable

sudo chown $USER "$BINARY_PATH"   # user can overwrite it
sudo chmod +x "$BINARY_PATH"

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
`);
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
