# AyazTrade Kubernetes Deployment

This directory contains Kubernetes manifests for deploying AyazTrade to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured
- Helm (optional, for advanced deployments)

## Quick Start

1. Apply all manifests:
```bash
kubectl apply -k .
```

2. Check deployment status:
```bash
kubectl get pods -n ayaztrade
kubectl get services -n ayaztrade
kubectl get ingress -n ayaztrade
```

## Components

- **Namespace**: `ayaztrade`
- **API**: NestJS backend with 3 replicas
- **Database**: PostgreSQL with persistent storage
- **Cache**: Redis with persistent storage
- **Search**: Elasticsearch with persistent storage
- **Ingress**: Nginx with SSL termination
- **HPA**: Horizontal Pod Autoscaler for API

## Configuration

### Environment Variables

All environment variables are configured via ConfigMap and Secret:

- **ConfigMap**: Non-sensitive configuration
- **Secret**: Sensitive data (passwords, API keys)

### Storage

- **PostgreSQL**: 20Gi persistent volume
- **Redis**: 5Gi persistent volume
- **Elasticsearch**: 10Gi persistent volume
- **Backups**: 10Gi persistent volume

### Scaling

- **API**: 3-10 replicas based on CPU/memory usage
- **Database**: Single replica (consider read replicas for production)
- **Cache**: Single replica
- **Search**: Single replica

## Production Considerations

1. **Security**:
   - Use proper secrets management
   - Enable network policies
   - Use RBAC for service accounts

2. **Monitoring**:
   - Deploy Prometheus and Grafana
   - Set up alerting rules
   - Monitor resource usage

3. **Backup**:
   - Set up database backups
   - Test restore procedures
   - Store backups securely

4. **SSL/TLS**:
   - Configure cert-manager for automatic SSL
   - Use Let's Encrypt or your CA
   - Enable HSTS

## Troubleshooting

### Check Pod Status
```bash
kubectl describe pod <pod-name> -n ayaztrade
kubectl logs <pod-name> -n ayaztrade
```

### Check Service Connectivity
```bash
kubectl exec -it <api-pod> -n ayaztrade -- curl http://postgres-service:5432
kubectl exec -it <api-pod> -n ayaztrade -- curl http://redis-service:6379
```

### Check Ingress
```bash
kubectl describe ingress ayaztrade-ingress -n ayaztrade
```

## Customization

### Resource Limits
Edit `deployment.yaml` to adjust CPU/memory limits:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Scaling
Edit `hpa.yaml` to adjust scaling parameters:

```yaml
minReplicas: 3
maxReplicas: 10
```

### Storage
Edit PVC manifests to adjust storage size and class:

```yaml
resources:
  requests:
    storage: 20Gi
storageClassName: standard
```
