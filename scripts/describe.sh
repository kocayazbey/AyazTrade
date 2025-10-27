#!/bin/bash

# AyazTrade Describe Script
# This script shows detailed information about AyazTrade resources

set -e

# Configuration
NAMESPACE="ayaztrade"
RESOURCE=${1:-"all"}

echo "Describing AyazTrade resources..."
echo "Namespace: $NAMESPACE"
echo "Resource: $RESOURCE"

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

# Describe resource based on resource
case $RESOURCE in
    "pods")
        echo "Describing pods..."
        kubectl describe pods -n $NAMESPACE
        ;;
    "services")
        echo "Describing services..."
        kubectl describe services -n $NAMESPACE
        ;;
    "deployments")
        echo "Describing deployments..."
        kubectl describe deployments -n $NAMESPACE
        ;;
    "ingress")
        echo "Describing ingress..."
        kubectl describe ingress -n $NAMESPACE
        ;;
    "hpa")
        echo "Describing HPA..."
        kubectl describe hpa -n $NAMESPACE
        ;;
    "pvc")
        echo "Describing PVCs..."
        kubectl describe pvc -n $NAMESPACE
        ;;
    "all")
        echo "Describing all resources..."
        echo "=== Pods ==="
        kubectl describe pods -n $NAMESPACE
        echo ""
        echo "=== Services ==="
        kubectl describe services -n $NAMESPACE
        echo ""
        echo "=== Deployments ==="
        kubectl describe deployments -n $NAMESPACE
        echo ""
        echo "=== Ingress ==="
        kubectl describe ingress -n $NAMESPACE
        echo ""
        echo "=== HPA ==="
        kubectl describe hpa -n $NAMESPACE
        echo ""
        echo "=== PVCs ==="
        kubectl describe pvc -n $NAMESPACE
        ;;
    *)
        echo "Usage: $0 <resource>"
        echo "Resources: pods, services, deployments, ingress, hpa, pvc, all"
        echo "Example: $0 pods"
        exit 1
        ;;
esac
