#!/bin/bash

# AyazTrade Deployment Script
# This script deploys AyazTrade to Kubernetes

set -e

# Configuration
NAMESPACE="ayaztrade"
IMAGE_TAG=${1:-"latest"}
REGISTRY=${2:-"localhost:5000"}

echo "Deploying AyazTrade to Kubernetes..."
echo "Namespace: $NAMESPACE"
echo "Image Tag: $IMAGE_TAG"
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

# Create namespace if it doesn't exist
echo "Creating namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap and Secret
echo "Applying configuration..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Apply PVCs
echo "Applying persistent volume claims..."
kubectl apply -f k8s/pvc.yaml

# Deploy database
echo "Deploying PostgreSQL..."
kubectl apply -f k8s/postgres.yaml

# Deploy cache
echo "Deploying Redis..."
kubectl apply -f k8s/redis.yaml

# Deploy search
echo "Deploying Elasticsearch..."
kubectl apply -f k8s/elasticsearch.yaml

# Wait for services to be ready
echo "Waiting for services to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=elasticsearch -n $NAMESPACE --timeout=300s

# Deploy API
echo "Deploying API..."
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Deploy ingress
echo "Deploying ingress..."
kubectl apply -f k8s/ingress.yaml

# Deploy HPA
echo "Deploying HPA..."
kubectl apply -f k8s/hpa.yaml

# Wait for API to be ready
echo "Waiting for API to be ready..."
kubectl wait --for=condition=ready pod -l app=ayaztrade-api -n $NAMESPACE --timeout=300s

# Check deployment status
echo "Checking deployment status..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

echo "Deployment completed successfully!"
echo "API is available at: https://api.ayaztrade.com"
echo "Health check: https://api.ayaztrade.com/health"
echo "Metrics: https://api.ayaztrade.com/metrics"
