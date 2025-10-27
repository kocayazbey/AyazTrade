#!/bin/bash

# AyazTrade Cleanup Script
# This script cleans up old backups and temporary files

set -e

# Configuration
BACKUP_DIR=${BACKUP_DIR:-./backups}
RETENTION_DAYS=${RETENTION_DAYS:-7}
LOG_DIR=${LOG_DIR:-./logs}

echo "Cleaning up AyazTrade..."
echo "Backup directory: $BACKUP_DIR"
echo "Retention days: $RETENTION_DAYS"
echo "Log directory: $LOG_DIR"

# Clean up old backups
if [ -d "$BACKUP_DIR" ]; then
    echo "Cleaning up old backups..."
    find "$BACKUP_DIR" -name "backup_*.sql*" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "ayaztrade-k8s-backup-*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo "Old backups cleaned up"
else
    echo "Backup directory not found: $BACKUP_DIR"
fi

# Clean up old logs
if [ -d "$LOG_DIR" ]; then
    echo "Cleaning up old logs..."
    find "$LOG_DIR" -name "*.log" -type f -mtime +$RETENTION_DAYS -delete
    echo "Old logs cleaned up"
else
    echo "Log directory not found: $LOG_DIR"
fi

# Clean up temporary files
echo "Cleaning up temporary files..."
find /tmp -name "ayaztrade-*" -type f -mtime +1 -delete 2>/dev/null || true
find /tmp -name "k8s-*" -type f -mtime +1 -delete 2>/dev/null || true

# Clean up Docker images (if Docker is available)
if command -v docker &> /dev/null; then
    echo "Cleaning up Docker images..."
    docker image prune -f
    docker container prune -f
    docker volume prune -f
    echo "Docker cleanup completed"
fi

# Clean up Kubernetes resources (if kubectl is available)
if command -v kubectl &> /dev/null; then
    echo "Cleaning up Kubernetes resources..."
    kubectl delete pods --field-selector=status.phase=Succeeded --all-namespaces --ignore-not-found=true
    kubectl delete pods --field-selector=status.phase=Failed --all-namespaces --ignore-not-found=true
    echo "Kubernetes cleanup completed"
fi

echo "Cleanup completed successfully!"
