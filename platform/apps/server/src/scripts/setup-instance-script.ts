import { env } from "../lib/env.js";

interface SetupInstanceScriptOptions {
  sshKey: string;
  authToken: string;
  projectSessionId: string;
  instanceId: string;
  terminate?: boolean;
  username?: string;
}

export const setupInstanceScript = ({
  sshKey,
  authToken,
  projectSessionId,
  instanceId,
  terminate = false,
  username = "ubuntu",
}: SetupInstanceScriptOptions): string => {
  return `#!/usr/bin/env bash
set -euxo pipefail
mkdir -p /home/ubuntu/.logs
exec > /home/ubuntu/.logs/vibeongo.log 2>&1

date

USER_HOME="/home/${username}"

now_ms() {
  local now_ns
  now_ns=$(date +%s%N)
  printf '%s\\n' "$((10#$now_ns / 1000000))"
}

measure() {
  local phase="$1"
  shift
  local started_at ended_at duration_ms status
  started_at=$(now_ms)
  printf '>>> VIBEONGO_SETUP >>> phase=%s >>> event=start\n' "$phase"

  if "$@"; then
    status=success
  else
    status=failed
  fi

  ended_at=$(now_ms)
  duration_ms=$((ended_at - started_at))
  printf '>>> VIBEONGO_SETUP >>> phase=%s >>> duration_ms=%s >>> status=%s\n' "$phase" "$duration_ms" "$status"
  [ "$status" = success ]
}

setup_ssh() {
  mkdir -p "$USER_HOME/.ssh"
  echo "${sshKey}" >> "$USER_HOME/.ssh/authorized_keys"

  chmod 700 "$USER_HOME/.ssh"
  chmod 600 "$USER_HOME/.ssh/authorized_keys"
  chown -R ${username}:${username} "$USER_HOME/.ssh"
}

measure setup_ssh setup_ssh

# Create ${username} user script
cat <<SCRIPT > /tmp/${username}-setup.sh
#!/usr/bin/env bash
set -euxo pipefail

CONFIG_DIR="\\$HOME/.config/vibeongo"
mkdir -p "\\$CONFIG_DIR"

now_ms() {
  local now_ns
  now_ns=\\$(date +%s%N)
  printf '%s\\n' "\\$((10#\\$now_ns / 1000000))"
}

measure() {
  local phase="\\$1"
  shift
  local started_at ended_at duration_ms status
  started_at=\\$(now_ms)
  printf '>>> VIBEONGO_SETUP >>> phase=%s >>> event=start\\n' "\\$phase"

  if "\\$@"; then status=success; else status=failed; fi

  ended_at=\\$(now_ms)
  duration_ms=\\$((ended_at - started_at))
  printf '>>> VIBEONGO_SETUP >>> phase=%s >>> duration_ms=%s >>> status=%s\\n' "\\$phase" "\\$duration_ms" "\\$status"
  [ "\\$status" = success ]
}

fetch_runtime_config() {
  local config_tmp attempt request_started_at request_ended_at request_duration_ms
  config_tmp=\\$(mktemp)

  for attempt in {1..30}; do
    request_started_at=\\$(now_ms)
    if curl -fsS --request GET \\
      --url ${env.SERVER_URL}/api/v1/runtime/sessions/${projectSessionId}/config/${instanceId} \\
      --header "Authorization: Bearer ${authToken}" \\
      --header "X-Instance-Id: ${instanceId}" \\
      | jq -e '.data' > "\\$config_tmp"; then
      request_ended_at=\\$(now_ms)
      request_duration_ms=\\$((request_ended_at - request_started_at))
      printf '>>> VIBEONGO_SETUP >>> phase=runtime_config_api_attempt_%s >>> duration_ms=%s >>> status=success\\n' "\\$attempt" "\\$request_duration_ms"
      mv "\\$config_tmp" "\\$CONFIG_DIR/config.json"
      return 0
    fi

    request_ended_at=\\$(now_ms)
    request_duration_ms=\\$((request_ended_at - request_started_at))
    printf '>>> VIBEONGO_SETUP >>> phase=runtime_config_api_attempt_%s >>> duration_ms=%s >>> status=failed\\n' "\\$attempt" "\\$request_duration_ms"
    if [ "\\$attempt" -eq 30 ]; then
      echo "Failed to fetch runtime config after \\$attempt attempts" >&2
      rm -f "\\$config_tmp"
      return 1
    fi
    sleep 2
  done
}

measure fetch_runtime_config fetch_runtime_config

#Now vibeongo is pre cooked in the ami
measure install_vibeongo bash -c 'curl -fsSL ${env.SERVER_URL}/install | bash'

SCRIPT

chmod +x /tmp/${username}-setup.sh

# Run as ${username}
sudo -u ${username} /tmp/${username}-setup.sh

sudo -iu ${username} bash <<'VIBEONGO_COMMANDS'
set -euo pipefail

now_ms() {
  local now_ns
  now_ns=$(date +%s%N)
  printf '%s\\n' "$((10#$now_ns / 1000000))"
}

measure() {
  local phase="$1"
  shift
  local started_at ended_at duration_ms status
  started_at=$(now_ms)
  printf '>>> VIBEONGO_SETUP >>> phase=%s >>> event=start\n' "$phase"
  if "$@"; then status=success; else status=failed; fi
  ended_at=$(now_ms)
  duration_ms=$((ended_at - started_at))
  printf '>>> VIBEONGO_SETUP >>> phase=%s >>> duration_ms=%s >>> status=%s\n' "$phase" "$duration_ms" "$status"
  [ "$status" = success ]
}

measure provisiontools vibeongo provisiontools
measure initial_script vibeongo initial-script
measure setup_github_repos vibeongo setup-github-repos
measure run_repos_setup_script vibeongo run-repos-setup-script
measure final_script vibeongo final-script
measure dev_script vibeongo dev-script
echo "doing with the tasks"
measure tasks vibeongo tasks
VIBEONGO_COMMANDS

date
echo ---done---
`;
};
// ${terminate ? "vibeongo terminate" : ""}
