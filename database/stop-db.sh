#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="letsplay"

if ! docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Container ${CONTAINER_NAME} does not exist" >&2
    exit 1
fi

if [ "$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME")" = "running" ]; then
    docker stop "$CONTAINER_NAME" >/dev/null
fi

echo "Container ${CONTAINER_NAME} is stopped"
