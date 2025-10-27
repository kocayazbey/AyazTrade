#!/bin/bash

# AyazTrade Scale Script
# This script scales AyazTrade deployment

set -e

# Configuration
NAMESPACE="ayaztrade"
REPLICAS=${1:-3}

echo "Scaling AyazTrade..."
echo "Namespace: $NAMESPACE"
echo "Replicas: $REPLICAS"

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

# Scale deployment
echo "Scaling deployment to $REPLICAS replicas..."
kubectl scale deployment ayaztrade-api --replicas=$REPLICAS -n $NAMESPACE

# Wait for scaling to complete
echo "Waiting for scaling to complete..."
kubectl rollout status deployment/ayaztrade-api -n $NAMESPACE --timeout=300s

# Check deployment status
echo "Checking deployment status..."
kubectl get pods -n $NAMESPACE
kubectl get deployment ayaztrade-api -n $NAMESPACE

# Check HPA status
echo "Checking HPA status..."
kubectl get hpa ayaztrade-api-hpa -n $NAMESPACE

echo "Scaling completed successfully!"
echo "AyazTrade is now running with $REPLICAS replicas"
