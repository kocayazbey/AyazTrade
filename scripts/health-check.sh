#!/bin/bash

# AyazTrade Health Check Script
# This script checks the health of all AyazTrade services

set -e

# Configuration
NAMESPACE="ayaztrade"
API_URL="https://api.ayaztrade.com"

echo "Checking AyazTrade health..."
echo "Namespace: $NAMESPACE"
echo "API URL: $API_URL"

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

# Check namespace
echo "Checking namespace..."
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "Error: Namespace $NAMESPACE not found"
    exit 1
fi

# Check pods
echo "Checking pods..."
kubectl get pods -n $NAMESPACE

# Check services
echo "Checking services..."
kubectl get services -n $NAMESPACE

# Check ingress
echo "Checking ingress..."
kubectl get ingress -n $NAMESPACE

# Check API health
echo "Checking API health..."
if curl -f "$API_URL/health" &> /dev/null; then
    echo "API health check: PASSED"
else
    echo "API health check: FAILED"
    exit 1
fi

# Check API liveness
echo "Checking API liveness..."
if curl -f "$API_URL/health/liveness" &> /dev/null; then
    echo "API liveness check: PASSED"
else
    echo "API liveness check: FAILED"
    exit 1
fi

# Check API readiness
echo "Checking API readiness..."
if curl -f "$API_URL/health/readiness" &> /dev/null; then
    echo "API readiness check: PASSED"
else
    echo "API readiness check: FAILED"
    exit 1
fi

# Check API metrics
echo "Checking API metrics..."
if curl -f "$API_URL/metrics" &> /dev/null; then
    echo "API metrics check: PASSED"
else
    echo "API metrics check: FAILED"
    exit 1
fi

echo "All health checks passed!"
echo "AyazTrade is running successfully."
