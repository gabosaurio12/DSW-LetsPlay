#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="letsplay"
DATABASE_NAME="letsplay"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)" != "running" ]; then
    bash "$SCRIPT_DIR/start-db.sh"
fi

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" \
    < "$SCRIPT_DIR/seed.sql"

docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d "$DATABASE_NAME" <<'SQL'
SELECT 'Videogames' AS table_name, COUNT(*) AS row_count FROM "Videogames"
UNION ALL SELECT 'User', COUNT(*) FROM "User"
UNION ALL SELECT 'Communities', COUNT(*) FROM "Communities"
UNION ALL SELECT 'Post', COUNT(*) FROM "Post"
UNION ALL SELECT 'Comment', COUNT(*) FROM "Comment"
UNION ALL SELECT 'Reaction', COUNT(*) FROM "Reaction"
UNION ALL SELECT 'LfgPost', COUNT(*) FROM "LfgPost"
UNION ALL SELECT 'Report', COUNT(*) FROM "Report";
SQL

echo "Database ${DATABASE_NAME} seeded from database/seed.sql"
