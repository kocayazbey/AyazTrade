#!/bin/bash

# AyazTrade Kubernetes Backup Script
# This script creates backups of Kubernetes resources and data

set -e

# Configuration
NAMESPACE="ayaztrade"
BACKUP_DIR="./backups/k8s"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/ayaztrade-k8s-backup-$TIMESTAMP.tar.gz"

echo "Creating Kubernetes backup..."
echo "Namespace: $NAMESPACE"
echo "Backup file: $BACKUP_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup Kubernetes resources
echo "Backing up Kubernetes resources..."
kubectl get all -n $NAMESPACE -o yaml > "$BACKUP_DIR/resources-$TIMESTAMP.yaml"
kubectl get configmap -n $NAMESPACE -o yaml > "$BACKUP_DIR/configmaps-$TIMESTAMP.yaml"
kubectl get secret -n $NAMESPACE -o yaml > "$BACKUP_DIR/secrets-$TIMESTAMP.yaml"
kubectl get pvc -n $NAMESPACE -o yaml > "$BACKUP_DIR/pvcs-$TIMESTAMP.yaml"
kubectl get ingress -n $NAMESPACE -o yaml > "$BACKUP_DIR/ingress-$TIMESTAMP.yaml"
kubectl get hpa -n $NAMESPACE -o yaml > "$BACKUP_DIR/hpa-$TIMESTAMP.yaml"

# Backup database
echo "Backing up database..."
kubectl exec -n $NAMESPACE deployment/postgres -- pg_dump -U postgres ayaztrade > "$BACKUP_DIR/database-$TIMESTAMP.sql"

# Create archive
echo "Creating backup archive..."
tar -czf "$BACKUP_FILE" -C "$BACKUP_DIR" .

# Clean up temporary files
rm -f "$BACKUP_DIR"/*.yaml
rm -f "$BACKUP_DIR"/*.sql

echo "Backup completed successfully!"
echo "Backup file: $BACKUP_FILE"
echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
