# SSH gateway

The gateway accepts the 60-minute access token returned by the platform's
`POST /api/v1/project-sessions/:id/ssh-access` route as the SSH username. It
authorizes the token through the platform server on every new connection, opens the authorized runtime
terminal WebSocket, and bridges terminal input, output, and resize events.
The same token can reconnect until it expires or is revoked. The plaintext
token is returned only when created; the platform stores its hash.

## Configuration

| Variable | Purpose |
| --- | --- |
| `SSH_GATEWAY_API_URL` | Platform server origin, for example `http://server.vibeongo.com` or `https://server.vibeongo.com`. |
| `SSH_GATEWAY_TOKEN` | Shared secret matching the platform server's `SSH_GATEWAY_TOKEN`. |
| `SSH_GATEWAY_HOST_KEY_PATH` | Optional path to a persistent SSH private host key, readable only by its owner. If omitted, a key is created beside `core/.env`. |
| `SSH_GATEWAY_PORT` | TCP listening port loaded from `core/.env`. Defaults to `8005` if unset. |

The gateway loads `core/.env` when started from the repository root, `core/`,
or this command directory. Existing process environment variables take
precedence. To provide a host key yourself, create it once:

```sh
ssh-keygen -t ed25519 -f /var/lib/vibeongo/ssh_host_ed25519_key -N ''
```

Mount the same private key on every restart so clients see a stable host
identity. The gateway allows one interactive shell per SSH connection. It does
not support remote commands, SFTP, or port forwarding.

## Docker

Build from `core/` so the Go module is the build context:

```sh
docker build -f cmd/ssh-gateway/Dockerfile -t vibeongo-ssh-gateway .
docker run --rm --env-file .env -p 8005:8005 \
  -v vibeongo-ssh-gateway-keys:/var/lib/vibeongo vibeongo-ssh-gateway
```

The image does not include `.env`. Supply `SSH_GATEWAY_API_URL` and
`SSH_GATEWAY_TOKEN` at runtime. The named volume preserves the automatically
generated SSH host key across container restarts. The API URL must be reachable
from inside the container. If `SSH_GATEWAY_PORT` differs from `8005`, update the
published port as well.

Set the platform server's `SSH_GATEWAY_PORT` to the public SSH port as well. Its
default is `8005`, so the generated command includes `-p 8005`. The platform
omits `-p` only when explicitly configured with SSH's default port `22`.
