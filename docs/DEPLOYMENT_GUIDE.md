# AyazTrade Deployment Guide

## Overview

This guide covers deploying AyazTrade to various environments including development, staging, and production.

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 13+
- Redis 6+
- Docker and Docker Compose (optional)
- AWS CLI (for AWS deployment)
- Kubernetes CLI (for Kubernetes deployment)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/ayaztrade/ayaztrade.git
cd ayaztrade
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp env.example .env
```

Update the `.env` file with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=ayaztrade

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# AWS (for production)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket
```

## Development Deployment

### 1. Start Services with Docker Compose

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Elasticsearch
- Backend API
- Admin panel
- Storefront
- B2B portal

### 2. Run Database Migrations

```bash
npm run db:migrate
```

### 3. Seed Database (Optional)

```bash
npm run db:seed
```

### 4. Start Development Server

```bash
npm run start:dev
```

The application will be available at:
- API: http://localhost:3000
- Admin Panel: http://localhost:3001
- Storefront: http://localhost:3002
- B2B Portal: http://localhost:3003

## Production Deployment

### Option 1: Docker Deployment

#### 1. Build Docker Images

```bash
docker build -t ayaztrade-backend ./src
docker build -t ayaztrade-admin ./frontend/admin
docker build -t ayaztrade-storefront ./frontend/storefront
docker build -t ayaztrade-b2b ./frontend/b2b-portal
```

#### 2. Deploy with Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 3. Run Migrations

```bash
docker-compose exec backend npm run db:migrate
```

### Option 2: AWS Deployment

#### 1. AWS ECS Deployment

Create `aws-deployment.yml`:

```yaml
version: '3.8'
services:
  backend:
    image: ayaztrade-backend:latest
    environment:
      - NODE_ENV=production
      - DB_HOST=${DB_HOST}
      - DB_PASSWORD=${DB_PASSWORD}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:13
    environment:
      - POSTGRES_DB=ayaztrade
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### 2. Deploy to ECS

```bash
aws ecs create-cluster --cluster-name ayaztrade
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs create-service --cluster ayaztrade --service-name ayaztrade-service --task-definition ayaztrade
```

### Option 3: Kubernetes Deployment

#### 1. Create Namespace

```bash
kubectl create namespace ayaztrade
```

#### 2. Deploy ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ayaztrade-config
  namespace: ayaztrade
data:
  NODE_ENV: "production"
  DB_HOST: "postgres-service"
  REDIS_HOST: "redis-service"
```

#### 3. Deploy PostgreSQL

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: ayaztrade
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:13
        env:
        - name: POSTGRES_DB
          value: "ayaztrade"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: ayaztrade
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

#### 4. Deploy Redis

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: ayaztrade
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:6-alpine
        ports:
        - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: ayaztrade
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

#### 5. Deploy Backend

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ayaztrade-backend
  namespace: ayaztrade
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ayaztrade-backend
  template:
    metadata:
      labels:
        app: ayaztrade-backend
    spec:
      containers:
      - name: backend
        image: ayaztrade-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres-service"
        - name: REDIS_HOST
          value: "redis-service"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ayaztrade-backend-service
  namespace: ayaztrade
spec:
  selector:
    app: ayaztrade-backend
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### 6. Deploy Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ayaztrade-ingress
  namespace: ayaztrade
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.ayaztrade.com
    secretName: ayaztrade-tls
  rules:
  - host: api.ayaztrade.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ayaztrade-backend-service
            port:
              number: 80
```

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE ayaztrade;
CREATE USER ayaztrade_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ayaztrade TO ayaztrade_user;
```

### 2. Run Migrations

```bash
npm run db:migrate
```

### 3. Seed Data (Optional)

```bash
npm run db:seed
```

## SSL/TLS Configuration

### 1. Let's Encrypt with Certbot

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.ayaztrade.com
```

### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.ayaztrade.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.ayaztrade.com;

    ssl_certificate /etc/letsencrypt/live/api.ayaztrade.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.ayaztrade.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Logging

### 1. Prometheus Configuration

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'ayaztrade-backend'
    static_configs:
      - targets: ['localhost:9090']
```

### 2. Grafana Dashboard

Import the provided Grafana dashboard configuration for monitoring AyazTrade metrics.

### 3. Log Aggregation

Configure ELK stack (Elasticsearch, Logstash, Kibana) for centralized logging:

```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.15.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:7.15.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"

  kibana:
    image: docker.elastic.co/kibana/kibana:7.15.0
    ports:
      - "5601:5601"
```

## Backup and Recovery

### 1. Database Backup

```bash
# Create backup
pg_dump -h localhost -U ayaztrade_user ayaztrade > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -h localhost -U ayaztrade_user ayaztrade < backup_20240101_120000.sql
```

### 2. Automated Backups

Create a cron job for automated backups:

```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

## Security Considerations

### 1. Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80     # HTTP
ufw allow 443    # HTTPS
ufw allow 3000   # API (if not behind proxy)
ufw enable
```

### 2. Database Security

- Use strong passwords
- Enable SSL connections
- Restrict network access
- Regular security updates

### 3. Application Security

- Keep dependencies updated
- Use environment variables for secrets
- Enable rate limiting
- Implement proper CORS policies
- Use HTTPS in production

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check database credentials
   - Verify network connectivity
   - Check firewall settings

2. **Redis Connection Issues**
   - Verify Redis is running
   - Check Redis configuration
   - Verify network connectivity

3. **Memory Issues**
   - Monitor memory usage
   - Adjust Node.js memory limits
   - Consider horizontal scaling

### Logs

Check application logs:

```bash
# Docker logs
docker-compose logs -f backend

# Kubernetes logs
kubectl logs -f deployment/ayaztrade-backend -n ayaztrade
```

## Performance Optimization

### 1. Database Optimization

- Create appropriate indexes
- Use connection pooling
- Monitor query performance
- Regular VACUUM and ANALYZE

### 2. Application Optimization

- Enable gzip compression
- Use Redis for caching
- Implement CDN for static assets
- Optimize database queries

### 3. Infrastructure Optimization

- Use load balancers
- Implement auto-scaling
- Use CDN for static content
- Monitor and optimize resource usage

## Scaling

### Horizontal Scaling

1. **Load Balancer Configuration**
2. **Database Read Replicas**
3. **Redis Cluster**
4. **Microservices Architecture**

### Vertical Scaling

1. **Increase Server Resources**
2. **Optimize Application Code**
3. **Database Tuning**
4. **Caching Strategies**

## Maintenance

### Regular Tasks

1. **Security Updates**
2. **Dependency Updates**
3. **Database Maintenance**
4. **Log Rotation**
5. **Backup Verification**

### Monitoring

1. **Application Health**
2. **Database Performance**
3. **Server Resources**
4. **Error Rates**
5. **Response Times**
