# 1. Deployment Overview
EasyQR is deployed as a containerized backend stack using Docker Compose.

Core runtime components in this repository:
- **EasyQR Server** (`easyqr-server`): Node.js API + WebSocket runtime
- **PostgreSQL** (`postgres`): persistent session/scan/security/audit storage
- **Redis** (`redis`): event bus + rate-limit counters
- **SDK Consumers**: Blisky frontend(s) calling EasyQR over HTTP and WebSocket

High-level runtime model:
- Blisky frontend calls EasyQR HTTP APIs to create sessions
- Desktop/mobile clients connect to EasyQR WebSocket endpoint
- EasyQR streams scan events back to host subscriber(s)
- Blisky backend remains system-of-record for inventory updates

---

# 2. Deployment Models (CRITICAL SECTION)
## Option A — Client Hosted Deployment (Recommended for Enterprise)
EasyQR runs inside Blisky-controlled infrastructure using this repository’s Docker stack.

Architecture:
`Blisky Infrastructure -> Docker Compose -> EasyQR Server + PostgreSQL + Redis`

Responsibilities:
- Client owns runtime environment, uptime, backups, monitoring
- EasyQR team provides application updates and release guidance

Advantages:
- Data stays in client environment
- Full network/security control
- Lower long-term platform dependency risk

Requirements:
- Docker + Docker Compose support
- Linux VM or cloud instance
- Network route from Blisky frontend to EasyQR API/WebSocket endpoint

## Option B — EasyQR Cloud Hosted
EasyQR runtime is hosted by EasyQR team in an external environment.

Architecture:
`EasyQR-hosted runtime -> API/WS endpoint -> Blisky system`

Responsibilities:
- EasyQR team manages runtime operation and maintenance
- Blisky team manages integration and business logic

Advantages:
- Fast onboarding
- Minimal infrastructure setup for client

Tradeoffs:
- External service dependency
- Hosting/service cost and contractual ownership boundaries

## Option C — Hybrid Deployment
Split responsibility model.

Typical pattern:
- Core EasyQR runtime hosted by EasyQR team
- Client restricts network access and integration path via internal gateways/proxies

Use case:
- Client wants reduced ops burden but still requires controlled connectivity and security boundaries.

---

# 3. Infrastructure Requirements
The repository does not enforce hard hardware limits, but below is a practical baseline for production start.

| Resource | Baseline (single-node start) |
|---|---|
| CPU | 2 vCPU |
| RAM | 4 GB |
| Storage | 20+ GB SSD (depends on retention/log policy) |
| Network | Stable low-latency connectivity between Blisky frontend and EasyQR endpoint |

Ports:
- Public/API ingress: `3000` (HTTP + WebSocket on same port)
- Internal container ports:
  - PostgreSQL: `5432`
  - Redis: `6379`

Scaling expectations:
- EasyQR server is designed for multi-instance coordination with Redis
- PostgreSQL and Redis should be deployed with production-grade persistence/backup strategy in enterprise environments

---

# 4. Docker Architecture
Why Docker is used:
- Repeatable runtime packaging
- Environment consistency across dev/staging/prod
- Service isolation (app, DB, cache)

Containers defined in `docker-compose.yml`:
- `easyqr-server`
- `postgres`
- `redis`

Compose networking:
- Dedicated bridge network: `easyqr-net`
- Service-to-service DNS by compose service name (`postgres`, `redis`)
- Only EasyQR server is exposed to host (`HOST_PORT:3000`)

Persistence:
- Postgres uses named volume: `easyqr_postgres_data`

---

# 5. Environment Configuration
Primary reference:
- `.env.docker.example`

Current example values:
- `DATABASE_URL`
- `REDIS_URL`
- `PORT`
- `NODE_ENV`

Compose also supports operational env vars (defined in `docker-compose.yml`), including:
- `JWT_SECRET`
- `SESSION_TTL_SECONDS`
- `EASYQR_ALLOWED_ORIGINS`
- `EASYQR_STORAGE_BACKEND`
- `EASYQR_REDIS_ENABLED`
- `EASYQR_ADMIN_TOKEN`
- rate-limit and lifecycle tuning variables

Secrets handling guidance:
- Do not commit real secrets to git
- Inject secrets through environment management (CI/CD variables, secret store, or protected host env)
- Set strong `JWT_SECRET` and `EASYQR_ADMIN_TOKEN` in production

---

# 6. Deployment Steps (Client Hosted)
1. Clone repository on deployment host.
2. Prepare environment values (copy `.env.docker.example` to a local env file strategy).
3. Build and start containers.
4. Verify readiness before routing user traffic.

Example commands:
```bash
# from repo root
docker compose build
docker compose up -d
```

Using repository deployment script:
```bash
export IMAGE_TAG=latest
export HOST_PORT=3000
./deploy/deploy.sh
```

What `deploy/deploy.sh` does:
- pulls postgres/redis images
- builds `easyqr-server`
- starts compose stack
- blocks on readiness check (`/health/ready`)

---

# 7. Health Verification
Health endpoints:
- `GET /health/live` -> process liveness
- `GET /health/ready` -> traffic readiness gate
- `GET /health` -> runtime summary (storage backend, redis state, rate-limit degraded flag)

Production validation sequence:
```bash
curl -f http://localhost:3000/health/live
curl -f http://localhost:3000/health/ready
curl -f http://localhost:3000/health
```

Operational meaning:
- Use `/health/live` for liveness probes
- Use `/health/ready` before exposing traffic after deploy/restart

---

# 8. Networking Model
```text
             (HTTP + WS :3000)
Blisky Frontend  -------------------->  EasyQR Server
                                           |      |
                                (internal) |      | (internal)
                                           v      v
                                        PostgreSQL Redis
```

Key points:
- Blisky talks only to EasyQR server endpoint
- PostgreSQL/Redis remain internal service dependencies
- WebSocket uses same externally exposed service port as HTTP

Firewall expectations:
- allow inbound traffic to EasyQR server port from approved Blisky networks
- allow outbound/intra-host traffic for internal DB/cache container communication

---

# 9. Upgrade Procedure
Safe upgrade flow (script-based):
1. Prepare new release/tag in deployment environment.
2. Deploy with readiness gate.
3. Verify health and integration smoke tests.

Example:
```bash
export IMAGE_TAG=prod-<release-id>
export HOST_PORT=3000
./deploy/deploy.sh
```

Post-upgrade checks:
- `/health/ready` returns `200`
- session creation works
- WebSocket host/mobile pairing works
- scan events propagate end-to-end

---

# 10. Rollback Procedure
Rollback is script-driven via `deploy/rollback.sh`.

Example:
```bash
export PREVIOUS_IMAGE_TAG=<last-known-good-tag>
export HOST_PORT=3000
./deploy/rollback.sh
```

What rollback script does:
1. Requires `PREVIOUS_IMAGE_TAG`
2. Stops current stack (`docker compose down`)
3. Starts stack with previous tag (`docker compose up -d --no-build`)
4. Waits for `/health/ready`

Production safety notes:
- Keep previous working image available on host/registry
- Validate readiness before re-opening traffic
- Execute quick session + scan smoke test after rollback

---

# 11. Observability & Monitoring
Available operational signals:
- Structured application logs from EasyQR server
- Health endpoints (`/health/live`, `/health/ready`, `/health`)
- Metrics endpoint (`/metrics`)

Example metrics:
- `http_requests_total`
- `http_errors_total`
- `ws_connections_active`
- `ws_connections_total`
- `redis_disconnects_total`

Client infra monitoring pattern:
- poll readiness/liveness
- scrape `/metrics`
- collect and centralize container logs
- alert on sustained readiness failures or elevated error rates

---

# 12. Security Considerations
- Use strong secrets for `JWT_SECRET` and admin token
- Restrict API exposure to trusted networks/origins
- Configure `EASYQR_ALLOWED_ORIGINS` to approved frontend origins
- Keep PostgreSQL and Redis internal-only (no public exposure)
- Terminate TLS at load balancer/reverse proxy or at service edge
- Rotate project API keys using provided project key endpoints

---

# 13. Recommended Production Topology
Recommended enterprise topology for client-hosted deployment:

```text
[Blisky Users]
      |
      v
[HTTPS Reverse Proxy / LB]
      |
      v
[EasyQR Server Container]
   |                 |
   v                 v
[PostgreSQL]      [Redis]
```

Guidance:
- run EasyQR behind controlled ingress
- keep DB/cache in private network segment
- apply backup policy to Postgres volume/data
- use environment-specific credentials and origin policy

---

# 14. Deployment Decision Guide
| Dimension | Client Hosted | EasyQR Hosted |
|---|---|---|
| Infrastructure control | High | Lower |
| Data locality control | High | Medium (depends on host agreement) |
| Setup time | Medium | Fast |
| Ongoing maintenance effort | Higher (client team) | Lower (client side) |
| Runtime cost ownership | Client infra budget | Service/hosting contract model |
| Security policy alignment | Strong for strict internal policies | Depends on external hosting policy fit |

Decision shortcut:
- Choose **Client Hosted** when control, policy, and internal data boundaries are primary.
- Choose **EasyQR Hosted** when speed and lower internal DevOps load are primary.
