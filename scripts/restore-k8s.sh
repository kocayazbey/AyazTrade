#!/bin/bash

# AyazTrade Kubernetes Restore Script
# This script restores AyazTrade from a Kubernetes backup

set -e

# Configuration
NAMESPACE="ayaztrade"
BACKUP_FILE=${1:-""}

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 ./backups/k8s/ayaztrade-k8s-backup-20231201_120000.tar.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring AyazTrade from Kubernetes backup..."
echo "Namespace: $NAMESPACE"
echo "Backup file: $BACKUP_FILE"

# Extract backup
echo "Extracting backup..."
TEMP_DIR=$(mktemp -d)
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Create namespace
echo "Creating namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Restore resources
echo "Restoring Kubernetes resources..."
kubectl apply -f "$TEMP_DIR/resources-"*.yaml
kubectl apply -f "$TEMP_DIR/configmaps-"*.yaml
kubectl apply -f "$TEMP_DIR/secrets-"*.yaml
kubectl apply -f "$TEMP_DIR/pvcs-"*.yaml
kubectl apply -f "$TEMP_DIR/ingress-"*.yaml
kubectl apply -f "$TEMP_DIR/hpa-"*.yaml

# Wait for services to be ready
echo "Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=elasticsearch -n $NAMESPACE --timeout=300s

# Restore database
echo "Restoring database..."
kubectl exec -i -n $NAMESPACE deployment/postgres -- psql -U postgres ayaztrade < "$TEMP_DIR/database-"*.sql

# Wait for API to be ready
echo "Waiting for API to be ready..."
kubectl wait --for=condition=ready pod -l app=ayaztrade-api -n $NAMESPACE --timeout=300s

# Clean up
rm -rf "$TEMP_DIR"

echo "Restore completed successfully!"
echo "API is available at: https://api.ayaztrade.com"
echo "Health check: https://api.ayaztrade.com/health"
