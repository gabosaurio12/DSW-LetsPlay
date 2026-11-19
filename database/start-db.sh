#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="letsplay"

if ! docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Container ${CONTAINER_NAME} does not exist; run database/init-db.sh first" >&2
    exit 1
fi

if [ "$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME")" != "running" ]; then
    docker start "$CONTAINER_NAME" >/dev/null
fi

# A stopped container needs a few seconds before accepting psql connections.
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

echo "Container ${CONTAINER_NAME} is running"
