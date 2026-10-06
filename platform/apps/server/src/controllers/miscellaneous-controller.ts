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

OPENCODE_BIN="$HOME/.opencode/bin/opencode"
echo "Waiting for OpenCode binary: $OPENCODE_BIN"
for attempt in {1..41}; do
  echo "OpenCode attempt $attempt/41 (running as $(id -un))"
  for inspected_path in "$HOME/.opencode" "$HOME/.opencode/bin" "$OPENCODE_BIN"; do
    if [[ -e "$inspected_path" || -L "$inspected_path" ]]; then
      stat -Lc '%n: type=%F size=%s bytes owner=%U:%G mode=%a modified=%y' "$inspected_path" || ls -ld "$inspected_path" || true
    else
      echo "$inspected_path: missing"
    fi
  done
  if [[ -e "$OPENCODE_BIN" ]] && command -v file > /dev/null 2>&1; then
    file -L "$OPENCODE_BIN" || true
  fi

  if [[ -x "$OPENCODE_BIN" ]] && "$OPENCODE_BIN" --version; then
    echo "OpenCode is executable on attempt $attempt/41"
    break
  fi

  if [[ -e "$OPENCODE_BIN" ]]; then
    echo "OpenCode is present but cannot run on attempt $attempt/41"
  else
    echo "OpenCode is missing on attempt $attempt/41"
  fi
  if [[ -e "$OPENCODE_BIN" ]] && command -v fuser > /dev/null 2>&1; then
    fuser -v "$OPENCODE_BIN" 2>&1 || true
  fi
  if (( attempt == 41 )); then
    echo "OpenCode is still unavailable after 120 seconds" >&2
    exit 1
  fi
  sleep 3
done

"$BINARY_PATH" provision-opencode

if [[ "$(cat /proc/1/comm)" == "systemd" ]]; then
  if ! sudo systemctl is-active --quiet docker; then
    sudo systemctl start docker
  fi

  SERVICE_USER="$(id -un)"
  SERVICE_HOME="$(getent passwd "$SERVICE_USER" | cut -d: -f6)"

  sudo tee /etc/systemd/system/vibeongo.service > /dev/null <<EOF
[Unit]
Description=Vibeongo Service
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Environment="HOME=$SERVICE_HOME"
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
