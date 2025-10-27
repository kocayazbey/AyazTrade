#!/bin/bash

# AyazTrade Update Script
# This script updates AyazTrade to a new version

set -e

# Configuration
NAMESPACE="ayaztrade"
NEW_VERSION=${1:-"latest"}
REGISTRY=${2:-"localhost:5000"}

echo "Updating AyazTrade..."
echo "Namespace: $NAMESPACE"
echo "New version: $NEW_VERSION"
echo "Registry: $REGISTRY"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed or not in PATH"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: Cannot connect to Kubernetes cluster"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "Error: Namespace $NAMESPACE not found"
    exit 1
fi

# Update deployment
echo "Updating deployment..."
kubectl set image deployment/ayaztrade-api api=$REGISTRY/ayaztrade/api:$NEW_VERSION -n $NAMESPACE

# Wait for rollout to complete
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/ayaztrade-api -n $NAMESPACE --timeout=300s

# Check deployment status
echo "Checking deployment status..."
kubectl get pods -n $NAMESPACE
kubectl get deployment ayaztrade-api -n $NAMESPACE

# Check API health
echo "Checking API health..."
kubectl exec -n $NAMESPACE deployment/ayaztrade-api -- curl -f http://localhost:3000/health || {
    echo "API health check failed"
    exit 1
}

echo "Update completed successfully!"
echo "AyazTrade has been updated to version $NEW_VERSION"
