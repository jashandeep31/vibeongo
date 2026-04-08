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
sudo curl -# -L https://l1.devsradar.com/vibeongo -o "$BINARY_PATH"

# Make executable
sudo chmod +x "$BINARY_PATH"


CONFIG_DIR=/home/ubuntu/.config/vibeongo 
mkdir -p $CONFIG_DIR

curl --request GET \
  --url https://l1.devsradar.com/api/v1/runtime/sessions/f9c32de9-c6ff-4d6d-8e28-d1dbfc855f38/config \
  --header 'Authorization: Bearer vps_jfx9emja1y36w02e16hs6rt6fbc4fa643c80e9acfe4e8cc2f7fc0c4c' \
  | jq '.data' > "$CONFIG_DIR/config.json"

sudo tee /etc/systemd/system/vibeongo.service > /dev/null <<EOF
[Unit]
Description=Vibeongo Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/vibeongo 
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF



systemctl daemon-reexec
systemctl daemon-reload
systemctl enable  vibeongo
systemctl start vibeongo
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
