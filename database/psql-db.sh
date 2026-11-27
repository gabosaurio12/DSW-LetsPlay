#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="letsplay"
DATABASE_NAME="letsplay"

if [ "$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)" != "running" ]; then
    echo "Container ${CONTAINER_NAME} is not running; run database/start-db.sh first" >&2
    exit 1
fi

docker exec -it "$CONTAINER_NAME" psql -U postgres -d "$DATABASE_NAME"
