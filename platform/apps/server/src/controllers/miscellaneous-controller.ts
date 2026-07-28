import { Request, Response } from "express";
import { catchAsync } from "../lib/catch-async.js";
import path from "node:path";
import fs from "node:fs";
import { env } from "../lib/env.js";

const RootPath = process.cwd();

export const installScript = catchAsync(
  async (_req: Request, res: Response) => {
    const downloadUrl =
      env.NODE_ENV === "production"
        ? "https://download.vibeongo.com/vibeongo"
        : `${env.SERVER_URL}/vibeongo`;

    res.status(200).type("text/plain").send(`#!/usr/bin/env bash
set -euo pipefail

APP="vibeongo"
BINARY_PATH="/usr/local/bin/$APP"
SERVICE_PATH="/etc/systemd/system/$APP.service"

RUN_USER="\${SUDO_USER:-\${USER:-ubuntu}}"
RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"

if [ -z "$RUN_HOME" ]; then
  RUN_USER="ubuntu"
  RUN_HOME="/home/ubuntu"
fi

LOG_DIR="$RUN_HOME/.logs"
PID_FILE="$LOG_DIR/$APP.pid"
LOG_FILE="$LOG_DIR/$APP.log"

echo "Installing $APP..."

sudo curl -f#L \\
  "${downloadUrl}" \\
  -o "$BINARY_PATH"

sudo chown root:root "$BINARY_PATH"
sudo chmod 0755 "$BINARY_PATH"

if [ "$(ps -p 1 -o comm= | xargs)" = "systemd" ]; then
  echo "systemd detected; installing service..."

  sudo tee "$SERVICE_PATH" >/dev/null <<EOF
[Unit]
Description=Vibeongo Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$RUN_HOME
Environment="HOME=$RUN_HOME"
Environment="USER=$RUN_USER"
Environment="TERM=xterm-256color"
Environment="COLORTERM=truecolor"
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=$BINARY_PATH serve
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable --now "$APP"

  echo "$APP installed and started using systemd."
else
  echo "systemd is not running; starting $APP directly..."

  sudo install -d \\
    -o "$RUN_USER" \\
    -g "$RUN_USER" \\
    -m 0755 \\
    "$LOG_DIR"

  if [ -f "$PID_FILE" ]; then
    OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"

    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
      echo "$APP is already running with PID $OLD_PID."
      exit 0
    fi

    rm -f "$PID_FILE"
  fi

  sudo -H -u "$RUN_USER" bash -c '
    nohup "$1" serve \\
      >>"$2" \\
      2>&1 \\
      </dev/null &

    echo $! > "$3"
  ' bash "$BINARY_PATH" "$LOG_FILE" "$PID_FILE"

  PID="$(cat "$PID_FILE")"

  sleep 1

  if kill -0 "$PID" 2>/dev/null; then
    echo "$APP started with PID $PID."
    echo "Logs: $LOG_FILE"
  else
    echo "$APP failed to start." >&2
    tail -n 100 "$LOG_FILE" >&2 || true
    exit 1
  fi
fi
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
