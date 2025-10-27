# AyazTrade Deployment Scripts

This directory contains scripts for deploying, managing, and maintaining AyazTrade.

## Scripts Overview

### Deployment Scripts

- **`deploy.sh`**: Deploy AyazTrade to Kubernetes
- **`undeploy.sh`**: Remove AyazTrade from Kubernetes
- **`backup-k8s.sh`**: Create backup of Kubernetes resources and data
- **`restore-k8s.sh`**: Restore AyazTrade from backup
- **`health-check.sh`**: Check health of all services

### Database Scripts

- **`backup.sh`**: Create database backup
- **`restore.sh`**: Restore database from backup

## Usage

### Deploy AyazTrade

```bash
# Deploy with default settings
./scripts/deploy.sh

# Deploy with custom image tag
./scripts/deploy.sh v1.0.0

# Deploy with custom registry
./scripts/deploy.sh v1.0.0 my-registry.com
```

### Undeploy AyazTrade

```bash
./scripts/undeploy.sh
```

### Backup and Restore

```bash
# Create backup
./scripts/backup-k8s.sh

# Restore from backup
./scripts/restore-k8s.sh ./backups/k8s/ayaztrade-k8s-backup-20231201_120000.tar.gz
```

### Health Check

```bash
./scripts/health-check.sh
```

## Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured
- curl (for health checks)
- tar and gzip (for backups)

## Configuration

### Environment Variables

Set these environment variables for customization:

```bash
export NAMESPACE="ayaztrade"
export API_URL="https://api.ayaztrade.com"
export BACKUP_DIR="./backups"
```

### Customization

Edit the scripts to customize:

- Namespace
- API URL
- Backup directory
- Resource limits
- Scaling parameters

## Troubleshooting

### Common Issues

1. **Namespace not found**:
   ```bash
   kubectl create namespace ayaztrade
   ```

2. **Pods not starting**:
   ```bash
   kubectl describe pod <pod-name> -n ayaztrade
   kubectl logs <pod-name> -n ayaztrade
   ```

3. **Services not accessible**:
   ```bash
   kubectl get services -n ayaztrade
   kubectl describe service <service-name> -n ayaztrade
   ```

4. **Ingress not working**:
   ```bash
   kubectl get ingress -n ayaztrade
   kubectl describe ingress ayaztrade-ingress -n ayaztrade
   ```

### Debug Commands

```bash
# Check pod status
kubectl get pods -n ayaztrade

# Check service endpoints
kubectl get endpoints -n ayaztrade

# Check ingress status
kubectl get ingress -n ayaztrade

# Check HPA status
kubectl get hpa -n ayaztrade

# Check resource usage
kubectl top pods -n ayaztrade
kubectl top nodes
```

## Security Considerations

1. **Secrets Management**:
   - Use proper secrets management
   - Rotate secrets regularly
   - Use external secret management systems

2. **Network Security**:
   - Use network policies
   - Enable RBAC
   - Use service mesh for advanced networking

3. **Backup Security**:
   - Encrypt backups
   - Store backups securely
   - Test restore procedures

## Monitoring and Alerting

1. **Health Checks**:
   - Use the health-check script
   - Set up monitoring dashboards
   - Configure alerting rules

2. **Metrics**:
   - Access metrics at `/metrics`
   - Set up Prometheus scraping
   - Create Grafana dashboards

3. **Logs**:
   - Use centralized logging
   - Set up log aggregation
   - Configure log retention

## Production Deployment

For production deployment:

1. **Use proper secrets management**
2. **Enable monitoring and alerting**
3. **Set up backup and restore procedures**
4. **Configure SSL/TLS certificates**
5. **Use production-grade storage**
6. **Set up disaster recovery**
7. **Configure auto-scaling**
8. **Use blue-green deployments**
