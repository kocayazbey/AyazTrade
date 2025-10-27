#!/bin/bash

# AyazTrade Exec Script
# This script executes commands in AyazTrade pods

set -e

# Configuration
NAMESPACE="ayaztrade"
SERVICE=${1:-"api"}
COMMAND=${2:-"bash"}

echo "Executing command in AyazTrade $SERVICE..."
echo "Namespace: $NAMESPACE"
echo "Command: $COMMAND"

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

# Execute command based on service
case $SERVICE in
    "api")
        echo "Executing command in API pod..."
        kubectl exec -it deployment/ayaztrade-api -n $NAMESPACE -- $COMMAND
        ;;
    "postgres")
        echo "Executing command in PostgreSQL pod..."
        kubectl exec -it deployment/postgres -n $NAMESPACE -- $COMMAND
        ;;
    "redis")
        echo "Executing command in Redis pod..."
        kubectl exec -it deployment/redis -n $NAMESPACE -- $COMMAND
        ;;
    "elasticsearch")
        echo "Executing command in Elasticsearch pod..."
        kubectl exec -it deployment/elasticsearch -n $NAMESPACE -- $COMMAND
        ;;
    *)
        echo "Usage: $0 <service> [command]"
        echo "Services: api, postgres, redis, elasticsearch"
        echo "Example: $0 api bash"
        echo "Example: $0 postgres psql -U postgres -d ayaztrade"
        exit 1
        ;;
esac
