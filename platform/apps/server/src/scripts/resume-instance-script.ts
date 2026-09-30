export const resumeInstanceScript = (): string => `#!/usr/bin/env bash
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
/usr/local/bin/vibeongo resume-runtime

echo "Restarting vibeongo serve"
if [[ "$(cat /proc/1/comm)" == "systemd" ]]; then
  sudo systemctl restart vibeongo
else
  pkill -x -f "/usr/local/bin/vibeongo serve" || true
  setsid nohup /usr/local/bin/vibeongo serve > "$HOME/.logs/vibeongo-serve.log" 2>&1 < /dev/null &
fi

echo "Waiting for vibeongo serve"
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:3101/ > /dev/null 2>&1; then
    echo "vibeongo serve is up"
    exit 0
  fi
  sleep 1
done

echo "vibeongo serve did not come up after resume" >&2
exit 1
VIBEONGO_RESUME
`;
