#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="letsplay"
DATABASE_NAME="letsplay"
DATABASE_USER="letsplay_admin"
USER_PASSWORD="adminPl4y"

if [ "$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)" != "running" ]; then
    echo "Container ${CONTAINER_NAME} is not running; run database/start-db.sh first" >&2
    exit 1
fi

docker exec -it "$CONTAINER_NAME" psql -U "$DATABASE_USER" -d "$DATABASE_NAME"
