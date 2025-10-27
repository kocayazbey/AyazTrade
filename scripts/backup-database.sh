#!/bin/bash

#############################
# PostgreSQL Backup Script
# Daily automated backups with retention
#############################

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ayazlogistics}"
DB_USER="${DB_USER:-ayazuser}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-ayaz-backups}"

# Security Configuration
GPG_RECIPIENT="${GPG_RECIPIENT:-backup@ayaztrade.com}"
GPG_KEY_ID="${GPG_KEY_ID:-}"
CHECKSUM_ENABLED="${CHECKSUM_ENABLED:-true}"
ENCRYPTION_ENABLED="${ENCRYPTION_ENABLED:-true}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ayazlogistics-$TIMESTAMP.sql.gz"
BACKUP_LOG="$BACKUP_DIR/backup-$TIMESTAMP.log"
CHECKSUM_FILE="$BACKUP_DIR/ayazlogistics-$TIMESTAMP.sha256"

echo "Starting backup at $(date)" | tee "$BACKUP_LOG"

# Perform backup
echo "Backing up database: $DB_NAME" | tee -a "$BACKUP_LOG"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  --verbose \
  2>> "$BACKUP_LOG" | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Database backup completed: $BACKUP_FILE ($BACKUP_SIZE)" | tee -a "$BACKUP_LOG"
else
  echo "❌ Database backup failed!" | tee -a "$BACKUP_LOG"
  exit 1
fi

# Generate checksum
if [ "$CHECKSUM_ENABLED" = "true" ]; then
  echo "Generating checksum..." | tee -a "$BACKUP_LOG"
  sha256sum "$BACKUP_FILE" > "$CHECKSUM_FILE"

  if [ $? -eq 0 ]; then
    echo "✅ Checksum generated: $CHECKSUM_FILE" | tee -a "$BACKUP_LOG"
  else
    echo "❌ Checksum generation failed!" | tee -a "$BACKUP_LOG"
    exit 1
  fi
fi

# Encrypt backup if enabled
if [ "$ENCRYPTION_ENABLED" = "true" ]; then
  ENCRYPTED_FILE="$BACKUP_FILE.gpg"
  echo "Encrypting backup with GPG..." | tee -a "$BACKUP_LOG"

  if [ -n "$GPG_KEY_ID" ]; then
    # Use specific key ID
    gpg --encrypt --recipient "$GPG_KEY_ID" --output "$ENCRYPTED_FILE" "$BACKUP_FILE"
  else
    # Use recipient email
    gpg --encrypt --recipient "$GPG_RECIPIENT" --output "$ENCRYPTED_FILE" "$BACKUP_FILE"
  fi

  if [ $? -eq 0 ]; then
    ENCRYPTED_SIZE=$(du -h "$ENCRYPTED_FILE" | cut -f1)
    echo "✅ Backup encrypted successfully: $ENCRYPTED_FILE ($ENCRYPTED_SIZE)" | tee -a "$BACKUP_LOG"

    # Generate checksum for encrypted file too
    if [ "$CHECKSUM_ENABLED" = "true" ]; then
      ENCRYPTED_CHECKSUM="$BACKUP_DIR/ayazlogistics-$TIMESTAMP.gpg.sha256"
      sha256sum "$ENCRYPTED_FILE" > "$ENCRYPTED_CHECKSUM"
      echo "✅ Encrypted file checksum: $ENCRYPTED_CHECKSUM" | tee -a "$BACKUP_LOG"
    fi

    # Remove unencrypted backup (keep only encrypted)
    rm "$BACKUP_FILE"
    if [ "$CHECKSUM_ENABLED" = "true" ]; then
      rm "$CHECKSUM_FILE"
    fi

    # Update file references
    BACKUP_FILE="$ENCRYPTED_FILE"
    BACKUP_SIZE="$ENCRYPTED_SIZE"
  else
    echo "❌ Backup encryption failed!" | tee -a "$BACKUP_LOG"
    exit 1
  fi
fi

# Upload to S3 (if configured)
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$S3_BUCKET" ]; then
  echo "Uploading to S3: s3://$S3_BUCKET/" | tee -a "$BACKUP_LOG"
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/$(basename $BACKUP_FILE)" \
    --storage-class STANDARD_IA
  
  if [ $? -eq 0 ]; then
    echo "✅ Uploaded to S3 successfully" | tee -a "$BACKUP_LOG"
  else
    echo "⚠️ S3 upload failed, keeping local copy" | tee -a "$BACKUP_LOG"
  fi
fi

# Clean up old backups (local)
echo "Cleaning up backups older than $RETENTION_DAYS days" | tee -a "$BACKUP_LOG"
find "$BACKUP_DIR" -name "ayazlogistics-*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "backup-*.log" -mtime +$RETENTION_DAYS -delete

# Clean up old S3 backups
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$S3_BUCKET" ]; then
  RETENTION_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
  aws s3 ls "s3://$S3_BUCKET/backups/" | while read -r line; do
    FILE_DATE=$(echo $line | awk '{print $4}' | grep -oP '\d{8}' | head -1)
    if [ "$FILE_DATE" -lt "$RETENTION_DATE" ]; then
      FILE_NAME=$(echo $line | awk '{print $4}')
      echo "Deleting old S3 backup: $FILE_NAME" | tee -a "$BACKUP_LOG"
      aws s3 rm "s3://$S3_BUCKET/backups/$FILE_NAME"
    fi
  done
fi

# Send notification (optional)
if [ -n "$SLACK_WEBHOOK_URL" ]; then
  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"✅ Database backup completed: $BACKUP_FILE ($BACKUP_SIZE)\"}"
fi

echo "Backup process completed at $(date)" | tee -a "$BACKUP_LOG"

