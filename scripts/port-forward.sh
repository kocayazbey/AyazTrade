#!/bin/bash

# AyazTrade Port Forward Script
# This script sets up port forwarding for local development

set -e

# Configuration
NAMESPACE="ayaztrade"
API_PORT=${1:-3000}
POSTGRES_PORT=${2:-5432}
REDIS_PORT=${3:-6379}
ELASTICSEARCH_PORT=${4:-9200}

echo "Setting up port forwarding for AyazTrade..."
echo "Namespace: $NAMESPACE"
echo "API Port: $API_PORT"
echo "PostgreSQL Port: $POSTGRES_PORT"
echo "Redis Port: $REDIS_PORT"
echo "Elasticsearch Port: $ELASTICSEARCH_PORT"

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

# Start port forwarding
echo "Starting port forwarding..."

# API
echo "Forwarding API to port $API_PORT..."
kubectl port-forward service/ayaztrade-api-service $API_PORT:3000 -n $NAMESPACE &
API_PID=$!

# PostgreSQL
echo "Forwarding PostgreSQL to port $POSTGRES_PORT..."
kubectl port-forward service/postgres-service $POSTGRES_PORT:5432 -n $NAMESPACE &
POSTGRES_PID=$!

# Redis
echo "Forwarding Redis to port $REDIS_PORT..."
kubectl port-forward service/redis-service $REDIS_PORT:6379 -n $NAMESPACE &
REDIS_PID=$!

# Elasticsearch
echo "Forwarding Elasticsearch to port $ELASTICSEARCH_PORT..."
kubectl port-forward service/elasticsearch-service $ELASTICSEARCH_PORT:9200 -n $NAMESPACE &
ELASTICSEARCH_PID=$!

echo ""
echo "Port forwarding is now active!"
echo "API: http://localhost:$API_PORT"
echo "PostgreSQL: localhost:$POSTGRES_PORT"
echo "Redis: localhost:$REDIS_PORT"
echo "Elasticsearch: http://localhost:$ELASTICSEARCH_PORT"
echo ""
echo "Press Ctrl+C to stop port forwarding"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping port forwarding..."
    kill $API_PID $POSTGRES_PID $REDIS_PID $ELASTICSEARCH_PID 2>/dev/null || true
    echo "Port forwarding stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait