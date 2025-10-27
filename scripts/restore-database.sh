#!/bin/bash

#############################
# PostgreSQL Restore Script
# Restore from backup file
#############################

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ayazlogistics}"
DB_USER="${DB_USER:-ayazuser}"
BACKUP_FILE="$1"

# Security Configuration
GPG_RECIPIENT="${GPG_RECIPIENT:-backup@ayaztrade.com}"
GPG_KEY_ID="${GPG_KEY_ID:-}"
CHECKSUM_ENABLED="${CHECKSUM_ENABLED:-true}"
ENCRYPTION_ENABLED="${ENCRYPTION_ENABLED:-true}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Usage with encryption: $0 <backup-file.sql.gz.gpg>"
  echo "Example: $0 /var/backups/postgresql/ayazlogistics-20250124-120000.sql.gz"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Check if file is encrypted
IS_ENCRYPTED=false
if [[ "$BACKUP_FILE" == *.gpg ]]; then
  IS_ENCRYPTED=true
  echo "🔐 Encrypted backup detected"
fi

echo "⚠️  WARNING: This will restore database $DB_NAME from backup"
echo "Backup file: $BACKUP_FILE"
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Verify checksum if enabled
if [ "$CHECKSUM_ENABLED" = "true" ]; then
  echo "🔍 Verifying checksum..."

  if [ "$IS_ENCRYPTED" = "true" ]; then
    CHECKSUM_FILE="${BACKUP_FILE}.sha256"
  else
    CHECKSUM_FILE="${BACKUP_FILE}.sha256"
  fi

  if [ -f "$CHECKSUM_FILE" ]; then
    if sha256sum -c "$CHECKSUM_FILE"; then
      echo "✅ Checksum verification passed"
    else
      echo "❌ Checksum verification failed!"
      read -p "Continue anyway? (yes/no): " FORCE_CONTINUE
      if [ "$FORCE_CONTINUE" != "yes" ]; then
        echo "Restore cancelled due to checksum failure"
        exit 1
      fi
    fi
  else
    echo "⚠️  Checksum file not found: $CHECKSUM_FILE"
    read -p "Continue without checksum verification? (yes/no): " SKIP_CHECKSUM
    if [ "$SKIP_CHECKSUM" != "yes" ]; then
      echo "Restore cancelled"
      exit 1
    fi
  fi
fi

# Decrypt if needed
if [ "$IS_ENCRYPTED" = "true" ]; then
  echo "🔓 Decrypting backup..."

  if [ -n "$GPG_KEY_ID" ]; then
    # Use specific key ID for decryption
    gpg --decrypt --recipient "$GPG_KEY_ID" --output "${BACKUP_FILE%.gpg}" "$BACKUP_FILE"
  else
    # Use recipient email for decryption
    gpg --decrypt --recipient "$GPG_RECIPIENT" --output "${BACKUP_FILE%.gpg}" "$BACKUP_FILE"
  fi

  if [ $? -eq 0 ]; then
    echo "✅ Backup decrypted successfully"
    BACKUP_FILE="${BACKUP_FILE%.gpg}"
  else
    echo "❌ Backup decryption failed!"
    exit 1
  fi
fi

# Drop existing connections
echo "Terminating existing connections..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d postgres \
  -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "Dropping database..."
PGPASSWORD="$DB_PASSWORD" dropdb \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  --if-exists \
  "$DB_NAME"

echo "Creating fresh database..."
PGPASSWORD="$DB_PASSWORD" createdb \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  "$DB_NAME"

# Restore from backup
echo "Restoring from backup..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --verbose \
  --no-owner \
  --no-acl

if [ $? -eq 0 ]; then
  echo "✅ Database restored successfully"
else
  echo "❌ Restore failed"
  exit 1
fi

# Verify restore
echo "Verifying restore..."
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo "Restored $TABLE_COUNT tables"
echo "Restore completed at $(date)"

