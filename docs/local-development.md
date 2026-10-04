# Local development

Install Docker with Docker Compose v2 or newer and Bun 1.3.11, then run from the repository root:

```sh
bun install --frozen-lockfile
bun run infra:up
docker compose ps -a
```

The stack runs Postgres 17 with pgvector, Redis 7 with the BullMQ-required
`noeviction` policy, and the community MinIO build pinned in `docker-compose.yml`.
Postgres creates empty `midday` and `midday_test` databases on its first start.
Startup waits for all three services to become healthy, then runs `minio-init`
to create the buckets. The initializer exits successfully and its container is
removed; any initialization error makes `infra:up` fail.

| Service | Default local address | Credentials |
| --- | --- | --- |
| Postgres | `localhost:5432` | `postgres` / `postgres` |
| Redis | `localhost:6379` | None |
| S3 API | `http://localhost:9000` | `midday` / `midday-secret` |
| MinIO console | `http://localhost:9001` | `midday` / `midday-secret` |

Use the local database and Redis values in the API, worker, and jobs `.env-template`
files when creating their `.env` files. `DATABASE_SSL=disable` allows connections
to local Postgres in any `NODE_ENV`. Use `require` for verified TLS or `no-verify`
for TLS without certificate verification. When unset, API and worker retain
their previous default: TLS disabled in development and unverified TLS otherwise.
Jobs now use that same default; set `DATABASE_SSL` explicitly for their deployment.

If a port is already occupied, override it without stopping the other service:

```sh
POSTGRES_PORT=5434 bun run infra:up
```

Update the application's database URLs to use port 5434 as well. The other overrides
are `REDIS_PORT`, `MINIO_PORT`, and `MINIO_CONSOLE_PORT`. Apply the same overrides
when running subsequent compose commands, and update Redis/storage URLs accordingly.

```sh
bun run infra:logs   # Follow service logs
bun run infra:down   # Stop services, retaining data
bun run infra:reset  # Delete this stack's volumes and recreate empty services
```

`infra:reset` deletes local database, Redis, and object storage data. Postgres init
scripts only run when its data volume is empty.

## Migrations

Phase 02 adds the schema baseline and migration commands. This phase starts backing
services only; it does not yet provide a working Supabase-free application.

## Auth setup

Phase 04 adds local authentication. Existing Supabase variables remain in the
templates until their replacements are implemented.

## Storage

Phase 06 connects the application to S3-compatible storage. The local stack already
creates a private `vault` bucket and public `avatars`, `apps`, and `institution-logos`
buckets. `institution-logos` supports the banking package's existing `R2_*` settings.

## Storage

MinIO provides private `vault` objects and public `avatars` and `apps` buckets.
Server uploads register their document rows synchronously before processing starts.
Set the `STORAGE_*` variables in the API and worker templates. Operations use
`STORAGE_ENDPOINT`; signed URLs use `STORAGE_PUBLIC_ENDPOINT` when configured.
The signing endpoint must be reachable by the browser and any external document
extraction provider. External AI providers cannot fetch localhost MinIO URLs, so
local extraction requires a reachable tunnel URL; ordinary storage uploads,
downloads, and exports work on localhost. R2 uses the account S3 endpoint with
region `auto` and public asset custom domains.
