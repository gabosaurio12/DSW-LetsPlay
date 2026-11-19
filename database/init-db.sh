#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="letsplay"
DATABASE_NAME="letsplay"
POSTGRES_PASSWORD="L3tsPl4y"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    if [ "$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME")" != "running" ]; then
        docker start "$CONTAINER_NAME" >/dev/null
    fi
else
    docker run -d --name "$CONTAINER_NAME" \
        -e "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
        -e POSTGRES_DB=postgres \
        postgres:16
fi

# A freshly started container is not ready to accept psql connections yet.
ready=false
for _ in $(seq 1 30); do
    if docker exec "$CONTAINER_NAME" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
        ready=true
        break
    fi
    sleep 1
done
if [ "$ready" != true ]; then
    echo "PostgreSQL container is not ready" >&2
    exit 1
fi

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
    < "$SCRIPT_DIR/roles.sql"

echo "Recreating database ${DATABASE_NAME}; existing data will be lost"

# CREATE DATABASE cannot run inside a transaction block.
docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${DATABASE_NAME}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${DATABASE_NAME};
CREATE DATABASE ${DATABASE_NAME};
SQL

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" \
    < "$SCRIPT_DIR/tables.sql"

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" \
    < "$SCRIPT_DIR/permissions.sql"

echo "Database ${DATABASE_NAME} initialized from database/*.sql"
