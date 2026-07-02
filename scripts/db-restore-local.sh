#!/usr/bin/env bash
# Run locally: bash scripts/db-restore-local.sh <path/to/dump.sql>
# Restores a pg_dump SQL file into the local Postgres Docker container.
set -euo pipefail

SQL_FILE="${1:-}"
if [[ -z "$SQL_FILE" || ! -f "$SQL_FILE" ]]; then
  echo "Usage: $0 <path/to/dump.sql>" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

LOCAL_DB_USER="fan_league"
LOCAL_DB_NAME="fan_league"
LOCAL_DB_PASSWORD="fan_league"

echo "Restoring '$SQL_FILE' → ${LOCAL_DB_USER}@local-docker/${LOCAL_DB_NAME}"
echo "WARNING: This will DROP and recreate the database. Continue? [y/N]"
read -r CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

# Ensure local postgres is running
docker compose -f "$COMPOSE_FILE" up -d postgres
echo "Waiting for postgres to be ready..."
docker compose -f "$COMPOSE_FILE" exec postgres sh -c \
  "until pg_isready -U $LOCAL_DB_USER -d $LOCAL_DB_NAME; do sleep 1; done"

# Drop and recreate DB
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$LOCAL_DB_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$LOCAL_DB_NAME\";"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$LOCAL_DB_USER" -d postgres \
  -c "CREATE DATABASE \"$LOCAL_DB_NAME\";"

# Pipe SQL file into the container
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" \
  < "$SQL_FILE"

echo "Done. Database '$LOCAL_DB_NAME' restored from $SQL_FILE"
