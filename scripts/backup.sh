#!/bin/bash

# AyazTrade Database Backup Script
# This script creates automated database backups

set -e

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-ayaztrade}
DB_USER=${DB_USER:-postgres}
BACKUP_DIR=${BACKUP_DIR:-./backups}
RETENTION_DAYS=${RETENTION_DAYS:-7}
COMPRESSION=${COMPRESSION:-true}
ENCRYPTION=${ENCRYPTION:-false}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo "Starting backup of database: $DB_NAME"
echo "Backup file: $BACKUP_FILE"

# Create database backup
if [ "$COMPRESSION" = "true" ]; then
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "${BACKUP_FILE}.gz"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    echo "Backup compressed: $BACKUP_FILE"
else
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
    echo "Backup created: $BACKUP_FILE"
fi

# Encrypt backup if enabled
if [ "$ENCRYPTION" = "true" ]; then
    if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
        echo "Error: BACKUP_ENCRYPTION_KEY not set for encryption"
        exit 1
    fi
    # This would be implemented with actual encryption logic
    echo "Backup encryption not implemented yet"
fi

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql*" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully"
echo "Backup file: $BACKUP_FILE"
echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
