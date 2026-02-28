# Wave 1 Proof — Containerization Baseline

## Objective
Validate Docker Compose runtime for EasyQR server + PostgreSQL + Redis in an isolated network with reproducible startup and operational health.

## Commands Executed

```bash
docker compose build
HOST_PORT=3005 docker compose up -d
HOST_PORT=3005 docker compose ps
HOST_PORT=3005 docker compose logs --no-color --tail=200 easyqr-server
HOST_PORT=3005 docker compose exec -T easyqr-server wget -qO- http://localhost:3000/health
HOST_PORT=3005 docker compose exec -T easyqr-server node -e "require('dns').lookup('postgres',(e,a)=>{if(e){process.exit(1);}console.log('postgres='+a);});"
HOST_PORT=3005 docker compose exec -T easyqr-server node -e "require('dns').lookup('redis',(e,a)=>{if(e){process.exit(1);}console.log('redis='+a);});"
HOST_PORT=3005 docker compose exec -T easyqr-server node -e "(async()=>{const WebSocket=require('ws');const r=await fetch('http://localhost:3000/api/sessions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId:'docker_probe'})});if(!r.ok){process.exit(1);}const j=await r.json();const ws=new WebSocket('ws://localhost:3000/ws?token='+encodeURIComponent(j.wsToken)+'&role=HOST');ws.on('open',()=>{console.log('ws_open session='+j.sessionId);ws.close();});ws.on('error',()=>process.exit(1));ws.on('close',()=>process.exit(0));setTimeout(()=>process.exit(1),5000);})();"
```

## Startup Logs (Server)

```text
> easyqr-service@1.0.0 migrate
> node scripts/run-migrations.js
applied 001_init_easyqr.sql
applied 002_security_api_keys_audit.sql
applied 003_tenant_isolation_expiry_constraints.sql

> easyqr-service@1.0.0 start
> node src/index.js
{"event":"service.started","port":3000,"storageBackend":"postgres","redisEnabled":true,"instanceId":"easyqr-docker-1"}
```

## Running Container List

```text
NAME              IMAGE                    STATUS                        PORTS
easyqr-postgres   postgres:16-alpine       Up (healthy)                  5432/tcp
easyqr-redis      redis:7-alpine           Up (healthy)                  6379/tcp
easyqr-server     easyqr-1-easyqr-server   Up (healthy)                  0.0.0.0:3005->3000/tcp
```

## Health Check Output

```json
{"status":"ok","requestId":"af013d21-1e10-4f70-9c34-b39b4a91849f","storageBackend":"postgres","redisEnabled":true,"redisConnected":true,"rateLimitDegraded":false}
```

## Network Validation (Service Name DNS)

```text
postgres=172.19.0.2
redis=172.19.0.3
```

## WebSocket Bootstrap Validation

```text
ws_open session=87dfc9ea-30ea-453f-94dc-15099e612ca6
```

## Validation Checklist

- [x] Docker image build completes.
- [x] Postgres container healthy.
- [x] Redis container healthy.
- [x] EasyQR server starts and runs migrations.
- [x] EasyQR server reports `storageBackend=postgres` and `redisEnabled=true`.
- [x] `/health` endpoint returns healthy payload.
- [x] Server resolves `postgres` and `redis` service names over compose network.
- [x] WebSocket server accepts authenticated connection.

## Notes

- Host port `3000` was already occupied by a local Node process during validation.
- Compose supports default `3000` mapping and was validated using `HOST_PORT=3005` override without runtime behavior changes.

