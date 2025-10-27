#!/bin/bash

# AyazTrade Restart Script
# This script restarts AyazTrade services

set -e

# Configuration
NAMESPACE="ayaztrade"
SERVICE=${1:-"api"}

echo "Restarting AyazTrade $SERVICE..."
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

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "Error: Namespace $NAMESPACE not found"
    exit 1
fi

# Restart service based on service
case $SERVICE in
    "api")
        echo "Restarting API deployment..."
        kubectl rollout restart deployment/ayaztrade-api -n $NAMESPACE
        kubectl rollout status deployment/ayaztrade-api -n $NAMESPACE --timeout=300s
        ;;
    "postgres")
        echo "Restarting PostgreSQL deployment..."
        kubectl rollout restart deployment/postgres -n $NAMESPACE
        kubectl rollout status deployment/postgres -n $NAMESPACE --timeout=300s
        ;;
    "redis")
        echo "Restarting Redis deployment..."
        kubectl rollout restart deployment/redis -n $NAMESPACE
        kubectl rollout status deployment/redis -n $NAMESPACE --timeout=300s
        ;;
    "elasticsearch")
        echo "Restarting Elasticsearch deployment..."
        kubectl rollout restart deployment/elasticsearch -n $NAMESPACE
        kubectl rollout status deployment/elasticsearch -n $NAMESPACE --timeout=300s
        ;;
    "all")
        echo "Restarting all services..."
        kubectl rollout restart deployment/ayaztrade-api -n $NAMESPACE
        kubectl rollout restart deployment/postgres -n $NAMESPACE
        kubectl rollout restart deployment/redis -n $NAMESPACE
        kubectl rollout restart deployment/elasticsearch -n $NAMESPACE
        
        echo "Waiting for all services to be ready..."
        kubectl rollout status deployment/ayaztrade-api -n $NAMESPACE --timeout=300s
        kubectl rollout status deployment/postgres -n $NAMESPACE --timeout=300s
        kubectl rollout status deployment/redis -n $NAMESPACE --timeout=300s
        kubectl rollout status deployment/elasticsearch -n $NAMESPACE --timeout=300s
        ;;
    *)
        echo "Usage: $0 <service>"
        echo "Services: api, postgres, redis, elasticsearch, all"
        echo "Example: $0 api"
        exit 1
        ;;
esac

echo "Restart completed successfully!"
echo "Service $SERVICE has been restarted"
