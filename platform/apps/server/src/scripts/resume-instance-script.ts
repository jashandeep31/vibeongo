import { env } from "../lib/env.js";

interface ResumeInstanceScriptOptions {
  authToken: string;
  projectSessionId: string;
  instanceId: string;
}

export const resumeInstanceScript = ({
  authToken,
  projectSessionId,
  instanceId,
}: ResumeInstanceScriptOptions): string => `#!/usr/bin/env bash
# E2B uses a login shell. Replace it so exit does not run .bash_logout.
exec bash <<'VIBEONGO_RESUME'
set -euo pipefail
mkdir -p "$HOME/.logs"

resume_log_file=$(mktemp "$HOME/.logs/resume-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX.log")
exec > >(tee -a "$resume_log_file") 2>&1
echo "Resume started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Resume log: $resume_log_file"
trap 'resume_exit_code=$?; echo "Resume finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) with exit code $resume_exit_code"' EXIT

echo "Restoring runtime configuration"
CONFIG_DIR="$HOME/.config/vibeongo"
mkdir -p "$CONFIG_DIR"
config_tmp=$(mktemp "$CONFIG_DIR/config-XXXXXX.json")

fetch_runtime_config() {
  local attempt
  for attempt in {1..30}; do
    if curl -fsS --connect-timeout 5 --max-time 10 \\
      --url '${`${env.SERVER_URL}/api/v1/runtime/sessions/${projectSessionId}/config/${instanceId}`.replaceAll("'", "'\\''")}' \\
      --header 'Authorization: Bearer ${authToken.replaceAll("'", "'\\''")}' \\
      --header "X-Instance-Id: ${instanceId}" \\
      | jq -e '.data | select(type == "object")' > "$config_tmp"; then
      mv "$config_tmp" "$CONFIG_DIR/config.json"
      return 0
    fi
    if [[ "$attempt" -eq 30 ]]; then
      rm -f "$config_tmp"
      echo "Failed to fetch runtime config" >&2
      return 1
    fi
    sleep 2
  done
}
fetch_runtime_config

echo "Starting Docker"
if [[ "$(cat /proc/1/comm)" == "systemd" ]]; then
  if ! sudo -n systemctl is-active --quiet docker; then
    sudo -n systemctl start docker
  fi
elif ! sudo -n docker info > /dev/null 2>&1; then
  setsid nohup sudo -n dockerd > "$HOME/.logs/dockerd.log" 2>&1 < /dev/null &
  for attempt in {1..20}; do
    if sudo -n docker info > /dev/null 2>&1; then
      break
    fi
    if [[ "$attempt" -eq 20 ]]; then
      echo "Docker did not start" >&2
      exit 1
    fi
    sleep 0.5
  done
fi

echo "Restoring OpenCode configuration"
/usr/local/bin/vibeongo provision-opencode

echo "Restarting vibeongo serve"
if [[ "$(cat /proc/1/comm)" == "systemd" ]]; then
  sudo -n systemctl restart vibeongo
else
  pkill -x -f "/usr/local/bin/vibeongo serve" || true
  setsid nohup /usr/local/bin/vibeongo serve > "$HOME/.logs/vibeongo-serve.log" 2>&1 < /dev/null &
fi

echo "Restoring remaining tools"
/usr/local/bin/vibeongo provisiontools --skip-docker

echo "Starting the development script"
/usr/local/bin/vibeongo dev-script

exit 0
VIBEONGO_RESUME
`;
