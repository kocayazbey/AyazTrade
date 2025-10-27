#!/bin/bash

# AyazTrade Undeployment Script
# This script removes AyazTrade from Kubernetes

set -e

# Configuration
NAMESPACE="ayaztrade"

echo "Undeploying AyazTrade from Kubernetes..."
echo "Namespace: $NAMESPACE"

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

# Delete HPA
echo "Deleting HPA..."
kubectl delete -f k8s/hpa.yaml --ignore-not-found=true

# Delete ingress
echo "Deleting ingress..."
kubectl delete -f k8s/ingress.yaml --ignore-not-found=true

# Delete API
echo "Deleting API..."
kubectl delete -f k8s/service.yaml --ignore-not-found=true
kubectl delete -f k8s/deployment.yaml --ignore-not-found=true

# Delete services
echo "Deleting services..."
kubectl delete -f k8s/elasticsearch.yaml --ignore-not-found=true
kubectl delete -f k8s/redis.yaml --ignore-not-found=true
kubectl delete -f k8s/postgres.yaml --ignore-not-found=true

# Delete PVCs
echo "Deleting persistent volume claims..."
kubectl delete -f k8s/pvc.yaml --ignore-not-found=true

# Delete secrets and configmaps
echo "Deleting secrets and configmaps..."
kubectl delete -f k8s/secret.yaml --ignore-not-found=true
kubectl delete -f k8s/configmap.yaml --ignore-not-found=true

# Delete namespace
echo "Deleting namespace..."
kubectl delete namespace $NAMESPACE --ignore-not-found=true

echo "Undeployment completed successfully!"
echo "All AyazTrade resources have been removed from Kubernetes."
