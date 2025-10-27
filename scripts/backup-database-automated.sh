#!/bin/bash

# Automated Database Backup Script with Verification
# Usage: ./backup-database-automated.sh [retention_days]

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ayazlogistics}"
RETENTION_DAYS="${1:-30}"
DATABASE_NAME="${DATABASE_NAME:-ayazlogistics}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_USER="${DATABASE_USER:-ayazlogistics_user}"
S3_BUCKET="${BACKUP_S3_BUCKET:-ayazlogistics-backups}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
EMAIL_NOTIFICATIONS="${BACKUP_EMAIL_NOTIFICATIONS:-false}"
BACKUP_WEBHOOK_URL="${BACKUP_WEBHOOK_URL}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Send notification to multiple channels
send_notification() {
    local status=$1
    local message=$2
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')

    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        local slack_payload
        case $status in
            "SUCCESS")
                slack_payload="{\"text\":\"✅ *Backup SUCCESS* ✅\n*Time:* $timestamp\n*Message:* $message\", \"channel\":\"#backups\"}"
                ;;
            "FAILED")
                slack_payload="{\"text\":\"❌ *Backup FAILED* ❌\n*Time:* $timestamp\n*Message:* $message\", \"channel\":\"#alerts\"}"
                ;;
            "WARNING")
                slack_payload="{\"text\":\"⚠️ *Backup WARNING* ⚠️\n*Time:* $timestamp\n*Message:* $message\", \"channel\":\"#backups\"}"
                ;;
            "STARTED")
                slack_payload="{\"text\":\"🔄 *Backup STARTED* 🔄\n*Time:* $timestamp\n*Database:* $DATABASE_NAME\", \"channel\":\"#backups\"}"
                ;;
            *)
                slack_payload="{\"text\":\"🔄 Backup ${status}: ${message}\"}"
                ;;
        esac

        curl -X POST -H 'Content-type: application/json' \
            --data "$slack_payload" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi

    # Email notification (if configured)
    if [ -n "$EMAIL_NOTIFICATIONS" ] && [ "$EMAIL_NOTIFICATIONS" = "true" ] && [ -n "$SMTP_HOST" ]; then
        case $status in
            "FAILED")
                echo "Subject: [CRITICAL] Database Backup Failed - $timestamp
To: admin@ayaztrade.com
From: backup@ayaztrade.com

CRITICAL: Database backup failed!

Time: $timestamp
Database: $DATABASE_NAME
Error: $message

Please check the backup logs immediately.
Server: $(hostname)
" | sendmail -t 2>/dev/null || true
                ;;
            "WARNING")
                echo "Subject: [WARNING] Database Backup Warning - $timestamp
To: admin@ayaztrade.com
From: backup@ayaztrade.com

WARNING: Database backup completed with warnings.

Time: $timestamp
Database: $DATABASE_NAME
Warning: $message

Please review the backup logs.
Server: $(hostname)
" | sendmail -t 2>/dev/null || true
                ;;
        esac
    fi

    # Webhook notification (generic)
    if [ -n "$BACKUP_WEBHOOK_URL" ]; then
        local webhook_payload="{
            \"status\": \"$status\",
            \"timestamp\": \"$timestamp\",
            \"database\": \"$DATABASE_NAME\",
            \"message\": \"$message\",
            \"server\": \"$(hostname)\",
            \"backup_file\": \"$FINAL_FILE\",
            \"backup_size\": \"$FINAL_SIZE\"
        }"

        curl -X POST -H 'Content-type: application/json' \
            --data "$webhook_payload" \
            "$BACKUP_WEBHOOK_URL" 2>/dev/null || true
    fi

    # Log to system log
    logger -t "DATABASE_BACKUP" "Status: $status, Time: $timestamp, Message: $message"
}

# Create backup directory
log "Creating backup directory..."
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

# Backup filename
BACKUP_FILE="ayazlogistics_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
ENCRYPTED_FILE="${COMPRESSED_FILE}.enc"

# Start backup
log "Starting database backup..."
send_notification "STARTED" "Database: ${DATABASE_NAME}, Time: ${TIMESTAMP}"

# Perform pg_dump
log "Running pg_dump..."
PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
    -h "$DATABASE_HOST" \
    -p "$DATABASE_PORT" \
    -U "$DATABASE_USER" \
    -d "$DATABASE_NAME" \
    -F c \
    -b \
    -v \
    -f "$BACKUP_FILE" 2>&1 | tee backup.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    error "pg_dump failed!"
    send_notification "FAILED" "pg_dump error - see logs"
    exit 1
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Compress backup
log "Compressing backup..."
gzip -9 "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    error "Compression failed!"
    send_notification "FAILED" "Compression error"
    exit 1
fi

COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
log "Compressed to: $COMPRESSED_FILE ($COMPRESSED_SIZE)"

# Encrypt backup if encryption key is provided
if [ -n "$ENCRYPTION_KEY" ]; then
    log "Encrypting backup..."
    openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "$COMPRESSED_FILE" \
        -out "$ENCRYPTED_FILE" \
        -k "$ENCRYPTION_KEY"
    
    if [ $? -ne 0 ]; then
        error "Encryption failed!"
        send_notification "FAILED" "Encryption error"
        exit 1
    fi
    
    rm "$COMPRESSED_FILE"
    FINAL_FILE="$ENCRYPTED_FILE"
    log "Encrypted to: $ENCRYPTED_FILE"
else
    FINAL_FILE="$COMPRESSED_FILE"
    warn "Encryption key not provided - backup is not encrypted"
fi

# Calculate checksum
log "Calculating checksum..."
CHECKSUM=$(sha256sum "$FINAL_FILE" | cut -d' ' -f1)
echo "$CHECKSUM" > "${FINAL_FILE}.sha256"
log "Checksum: $CHECKSUM"

# Upload to S3 if configured
if command -v aws &> /dev/null && [ -n "$S3_BUCKET" ]; then
    log "Uploading to S3..."
    aws s3 cp "$FINAL_FILE" "s3://${S3_BUCKET}/daily/${FINAL_FILE}" \
        --storage-class STANDARD_IA
    aws s3 cp "${FINAL_FILE}.sha256" "s3://${S3_BUCKET}/daily/${FINAL_FILE}.sha256"
    
    if [ $? -eq 0 ]; then
        log "Uploaded to S3 successfully"
    else
        warn "S3 upload failed - backup remains local only"
    fi
else
    warn "AWS CLI not available or S3_BUCKET not set - skipping S3 upload"
fi

# Test database connection before backup
log "Testing database connection..."
if command -v psql &> /dev/null; then
    PGPASSWORD="$DATABASE_PASSWORD" psql \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d "$DATABASE_NAME" \
        -c "SELECT 1;" > /dev/null 2>&1

    if [ $? -ne 0 ]; then
        error "Database connection test failed!"
        send_notification "FAILED" "Database connection test failed"
        exit 1
    fi
    log "✓ Database connection verified"
fi

# Verify backup integrity
log "Verifying backup integrity..."
if [ -n "$ENCRYPTION_KEY" ]; then
    # Decrypt and verify
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$ENCRYPTED_FILE" \
        -k "$ENCRYPTION_KEY" | gunzip | head -n 10 > /dev/null 2>&1
else
    # Verify compressed file
    gunzip -t "$COMPRESSED_FILE" 2>&1
fi

if [ $? -eq 0 ]; then
    log "✓ Backup integrity verified"
else
    error "✗ Backup integrity check failed!"
    send_notification "FAILED" "Integrity verification failed"
    exit 1
fi

# Enhanced backup validation
log "Performing enhanced backup validation..."

# Check backup file size (should not be empty or too small)
MIN_SIZE=1024  # 1KB minimum
if [ -n "$ENCRYPTION_KEY" ]; then
    ACTUAL_SIZE=$(stat -f%z "$ENCRYPTED_FILE" 2>/dev/null || stat -c%s "$ENCRYPTED_FILE")
else
    ACTUAL_SIZE=$(stat -f%z "$COMPRESSED_FILE" 2>/dev/null || stat -c%s "$COMPRESSED_FILE")
fi

if [ "$ACTUAL_SIZE" -lt "$MIN_SIZE" ]; then
    error "✗ Backup file too small! Size: $ACTUAL_SIZE bytes"
    send_notification "FAILED" "Backup file too small: $ACTUAL_SIZE bytes"
    exit 1
fi

log "✓ Backup size validation passed ($ACTUAL_SIZE bytes)"

# Test restore capability (basic check)
log "Testing restore capability..."
if [ -n "$ENCRYPTION_KEY" ]; then
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$ENCRYPTED_FILE" \
        -k "$ENCRYPTION_KEY" | gunzip | head -n 50 | grep -q "CREATE\|INSERT\|COPY" 2>/dev/null
else
    gunzip -c "$COMPRESSED_FILE" | head -n 50 | grep -q "CREATE\|INSERT\|COPY" 2>/dev/null
fi

if [ $? -eq 0 ]; then
    log "✓ Restore capability test passed"
else
    error "✗ Restore capability test failed!"
    send_notification "FAILED" "Restore capability test failed"
    exit 1
fi

# Database consistency check (if pg_dump available)
if command -v psql &> /dev/null; then
    log "Performing database consistency check..."
    TABLE_COUNT=$(PGPASSWORD="$DATABASE_PASSWORD" psql \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d "$DATABASE_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")

    if [ "$TABLE_COUNT" -eq "0" ]; then
        warn "No tables found in database!"
        send_notification "WARNING" "No tables found in database"
    else
        log "✓ Database consistency check passed ($TABLE_COUNT tables)"
    fi
fi

# Cleanup old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "ayazlogistics_*.sql.gz*" -mtime +${RETENTION_DAYS} -delete
DELETED_COUNT=$(find "$BACKUP_DIR" -name "ayazlogistics_*.sql.gz*" -mtime +${RETENTION_DAYS} | wc -l)
log "Deleted $DELETED_COUNT old backup(s)"

# Create backup metadata
cat > "${FINAL_FILE}.meta" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "database": "${DATABASE_NAME}",
  "size": "$(stat -f%z "$FINAL_FILE" 2>/dev/null || stat -c%s "$FINAL_FILE")",
  "compressed_size": "${COMPRESSED_SIZE}",
  "checksum": "${CHECKSUM}",
  "encrypted": $([ -n "$ENCRYPTION_KEY" ] && echo "true" || echo "false"),
  "retention_days": ${RETENTION_DAYS}
}
EOF

# Final summary
FINAL_SIZE=$(du -h "$FINAL_FILE" | cut -f1)
TOTAL_BACKUPS=$(ls -1 ayazlogistics_*.sql.gz* 2>/dev/null | wc -l)

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "✓ Backup completed successfully!"
log "  File: $FINAL_FILE"
log "  Size: $FINAL_SIZE"
log "  Checksum: $CHECKSUM"
log "  Total backups: $TOTAL_BACKUPS"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

send_notification "SUCCESS" "Size: ${FINAL_SIZE}, Checksum: ${CHECKSUM:0:16}..."

exit 0

