#!/usr/bin/env bash
# Run on the server: bash scripts/db-backup.sh
# Dumps the Postgres DB running inside Docker to a .sql file in the current directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR"
ENV_FILE="$SERVER_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: env file not found at $ENV_FILE" >&2
  exit 1
fi

# Load env vars (ignore comments and blank lines)
set -a
# shellcheck disable=SC1090
source <(grep -v '^#' "$ENV_FILE" | grep -v '^[[:space:]]*$')
set +a

: "${POSTGRES_USER:?POSTGRES_USER not set in $ENV_FILE}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set in $ENV_FILE}"
: "${POSTGRES_DB:?POSTGRES_DB not set in $ENV_FILE}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${SCRIPT_DIR}/../${POSTGRES_DB}_${TIMESTAMP}.sql"

echo "Backing up database '$POSTGRES_DB' from Docker container..."

docker compose -f "$SERVER_DIR/docker-compose.yml" \
  --env-file "$ENV_FILE" \
  exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$OUTPUT_FILE"

echo "Done: $OUTPUT_FILE ($(du -sh "$OUTPUT_FILE" | cut -f1))"
