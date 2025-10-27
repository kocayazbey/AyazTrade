#!/bin/bash

# AyazTrade Logs Script
# This script shows logs for AyazTrade services

set -e

# Configuration
NAMESPACE="ayaztrade"
SERVICE=${1:-"api"}
LINES=${2:-100}

echo "Showing logs for AyazTrade $SERVICE..."
echo "Namespace: $NAMESPACE"
echo "Lines: $LINES"

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

# Show logs based on service
case $SERVICE in
    "api")
        echo "Showing API logs..."
        kubectl logs -l app=ayaztrade-api -n $NAMESPACE --tail=$LINES
        ;;
    "postgres")
        echo "Showing PostgreSQL logs..."
        kubectl logs -l app=postgres -n $NAMESPACE --tail=$LINES
        ;;
    "redis")
        echo "Showing Redis logs..."
        kubectl logs -l app=redis -n $NAMESPACE --tail=$LINES
        ;;
    "elasticsearch")
        echo "Showing Elasticsearch logs..."
        kubectl logs -l app=elasticsearch -n $NAMESPACE --tail=$LINES
        ;;
    "all")
        echo "Showing all logs..."
        kubectl logs -l app=ayaztrade-api -n $NAMESPACE --tail=$LINES
        echo "--- PostgreSQL ---"
        kubectl logs -l app=postgres -n $NAMESPACE --tail=$LINES
        echo "--- Redis ---"
        kubectl logs -l app=redis -n $NAMESPACE --tail=$LINES
        echo "--- Elasticsearch ---"
        kubectl logs -l app=elasticsearch -n $NAMESPACE --tail=$LINES
        ;;
    *)
        echo "Usage: $0 <service> [lines]"
        echo "Services: api, postgres, redis, elasticsearch, all"
        echo "Example: $0 api 200"
        exit 1
        ;;
esac
