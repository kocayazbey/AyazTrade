#!/bin/bash

# AyazTrade Status Script
# This script shows the status of all AyazTrade services

set -e

# Configuration
NAMESPACE="ayaztrade"

echo "AyazTrade Status Report"
echo "========================"
echo "Namespace: $NAMESPACE"
echo "Timestamp: $(date)"
echo ""

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

# Show namespace status
echo "Namespace Status:"
kubectl get namespace $NAMESPACE
echo ""

# Show pods status
echo "Pods Status:"
kubectl get pods -n $NAMESPACE
echo ""

# Show services status
echo "Services Status:"
kubectl get services -n $NAMESPACE
echo ""

# Show ingress status
echo "Ingress Status:"
kubectl get ingress -n $NAMESPACE
echo ""

# Show HPA status
echo "HPA Status:"
kubectl get hpa -n $NAMESPACE
echo ""

# Show PVC status
echo "PVC Status:"
kubectl get pvc -n $NAMESPACE
echo ""

# Show resource usage
echo "Resource Usage:"
kubectl top pods -n $NAMESPACE
echo ""

# Show events
echo "Recent Events:"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10
echo ""

# Show API health
echo "API Health Check:"
if kubectl exec -n $NAMESPACE deployment/ayaztrade-api -- curl -f http://localhost:3000/health &> /dev/null; then
    echo "✓ API is healthy"
else
    echo "✗ API is unhealthy"
fi

echo ""
echo "Status report completed!"
