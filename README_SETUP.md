# AyazTrade - Complete Setup Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL 15+
- Redis (optional)
- Docker (optional)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd AyazTrade
```

### 2. Run Setup Script
**Linux/Mac:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows:**
```cmd
scripts\setup.bat
```

### 3. Manual Setup (Alternative)

#### Backend Setup
```bash
# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run database migrations
npm run db:push

# Start backend
npm run start:dev
```

#### Frontend Setup
```bash
# Admin Panel
cd frontend/admin
npm install
npm run dev

# Storefront (new terminal)
cd frontend/storefront
npm install
npm run dev

# B2B Portal (new terminal)
cd frontend/b2b-portal
npm install
npm run dev
```

## 🐳 Docker Setup

### Start All Services
```bash
docker-compose up --build
```

### Start Specific Services
```bash
# Database only
docker-compose up postgres redis elasticsearch -d

# Backend only
docker-compose up backend -d

# Frontend only
docker-compose up admin-panel storefront b2b-portal -d
```

## 📊 Available Services

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| Backend API | http://localhost:3000 | 3000 | NestJS API Server |
| Admin Panel | http://localhost:5001 | 5001 | Next.js Admin Dashboard |
| Storefront | http://localhost:5002 | 5002 | Next.js E-commerce Store |
| B2B Portal | http://localhost:5003 | 5003 | Next.js B2B Portal |
| PostgreSQL | localhost:5432 | 5432 | Database |
| Redis | localhost:6379 | 6379 | Cache |
| Elasticsearch | localhost:9200 | 9200 | Search Engine |

## 🏗️ Project Structure

```
AyazTrade/
├── src/                          # Backend source code
│   ├── modules/                  # Business modules
│   │   ├── crm/                  # Customer Relationship Management
│   │   ├── erp/                  # Enterprise Resource Planning
│   │   ├── wms/                  # Warehouse Management System
│   │   └── analytics/            # Analytics & Reporting
│   ├── core/                     # Core infrastructure
│   │   ├── database/             # Database service
│   │   ├── cache/                # Redis cache service
│   │   ├── events/               # Event bus service
│   │   └── elasticsearch/        # Search service
│   └── database/                 # Database schemas
│       └── schema/               # Drizzle schemas
├── frontend/                     # Frontend applications
│   ├── admin/                    # Admin dashboard
│   ├── storefront/               # E-commerce store
│   └── b2b-portal/               # B2B portal
├── test/                         # Test files
├── scripts/                      # Setup and utility scripts
├── docs/                         # Documentation
└── docker-compose.yml            # Docker configuration
```

## 🔧 Development Commands

### Backend Commands
```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugger

# Database
npm run db:generate        # Generate migrations
npm run db:push           # Push schema to database
npm run db:migrate       # Run migrations

# Testing
npm run test              # Run unit tests
npm run test:e2e          # Run e2e tests
npm run test:cov          # Run tests with coverage

# Build
npm run build             # Build for production
npm run start             # Start production server
```

### Frontend Commands
```bash
# Development
npm run dev               # Start development server
npm run dev:admin         # Start admin panel
npm run dev:storefront    # Start storefront
npm run dev:b2b          # Start B2B portal

# Build
npm run build             # Build for production
npm run start             # Start production server

# Testing
npm run test             # Run tests
npm run lint             # Run linter
```

## 🗄️ Database Schema

### CRM Tables
- `leads` - Sales leads
- `quotes` - Sales quotes
- `contracts` - Customer contracts
- `activities` - CRM activities

### ERP Tables
- `invoices` - Customer invoices
- `payments` - Payment records
- `efatura` - E-invoice records
- `journal_entries` - Accounting entries

### WMS Tables
- `warehouses` - Warehouse information
- `warehouse_locations` - Location hierarchy
- `inventory` - Inventory records
- `inventory_movements` - Stock movements
- `inventory_transfers` - Transfer orders

## 🔌 API Endpoints

### CRM Endpoints
```
GET    /api/v1/crm/leads              # List leads
POST   /api/v1/crm/leads              # Create lead
GET    /api/v1/crm/leads/:id          # Get lead
PATCH  /api/v1/crm/leads/:id          # Update lead
DELETE /api/v1/crm/leads/:id          # Delete lead
POST   /api/v1/crm/leads/:id/convert # Convert to customer

GET    /api/v1/crm/quotes             # List quotes
POST   /api/v1/crm/quotes             # Create quote
GET    /api/v1/crm/quotes/:id         # Get quote
PATCH  /api/v1/crm/quotes/:id         # Update quote
POST   /api/v1/crm/quotes/:id/send    # Send quote
POST   /api/v1/crm/quotes/:id/accept # Accept quote

GET    /api/v1/crm/contracts          # List contracts
POST   /api/v1/crm/contracts          # Create contract
GET    /api/v1/crm/contracts/:id     # Get contract
PATCH  /api/v1/crm/contracts/:id     # Update contract
POST   /api/v1/crm/contracts/:id/activate # Activate contract

GET    /api/v1/crm/activities         # List activities
POST   /api/v1/crm/activities         # Create activity
GET    /api/v1/crm/activities/:id     # Get activity
PATCH  /api/v1/crm/activities/:id     # Update activity
POST   /api/v1/crm/activities/:id/complete # Complete activity
```

### ERP Endpoints
```
GET    /api/v1/erp/invoices           # List invoices
POST   /api/v1/erp/invoices           # Create invoice
GET    /api/v1/erp/invoices/:id       # Get invoice
PATCH  /api/v1/erp/invoices/:id       # Update invoice
POST   /api/v1/erp/invoices/:id/send  # Send invoice

GET    /api/v1/erp/payments           # List payments
POST   /api/v1/erp/payments           # Record payment
GET    /api/v1/erp/payments/:id       # Get payment
PATCH  /api/v1/erp/payments/:id       # Update payment

GET    /api/v1/erp/accounting/journal-entries # List journal entries
POST   /api/v1/erp/accounting/journal-entries # Create journal entry
GET    /api/v1/erp/accounting/chart-of-accounts # Get chart of accounts
```

### WMS Endpoints
```
GET    /api/v1/wms/warehouse          # List warehouses
POST   /api/v1/wms/warehouse          # Create warehouse
GET    /api/v1/wms/warehouse/:id      # Get warehouse

GET    /api/v1/wms/inventory          # List inventory
POST   /api/v1/wms/inventory          # Create inventory record
GET    /api/v1/wms/inventory/:id      # Get inventory record

GET    /api/v1/wms/transfers          # List transfers
POST   /api/v1/wms/transfers          # Create transfer
GET    /api/v1/wms/transfers/:id      # Get transfer
```

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Run Specific Tests
```bash
npm run test:unit          # Unit tests only
npm run test:e2e           # E2E tests only
npm run test:integration   # Integration tests only
```

### Test Coverage
```bash
npm run test:cov
```

## 🚀 Deployment

### Production Build
```bash
# Build all applications
npm run build:all

# Start production
npm run start:prod
```

### Docker Deployment
```bash
# Build and start all services
docker-compose up --build -d

# Scale services
docker-compose up --scale backend=3
```

## 🔍 Monitoring & Health Checks

### Health Endpoints
- Backend: `GET /health`
- Database: `GET /health/database`
- Cache: `GET /health/cache`
- Elasticsearch: `GET /health/elasticsearch`

### Metrics
- Prometheus: `GET /metrics`
- Application metrics available at `/metrics`

## 📚 Documentation

- API Documentation: Available at `/api/docs` (Swagger)
- Architecture: `docs/ARCHITECTURE.md`
- Deployment: `docs/DEPLOYMENT_GUIDE.md`
- Developer Guide: `docs/DEVELOPER_GUIDE.md`

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if PostgreSQL is running
   docker-compose up postgres -d
   
   # Check connection
   npm run db:push
   ```

2. **Port Already in Use**
   ```bash
   # Kill process on port
   npx kill-port 3000
   ```

3. **Build Failures**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Frontend Build Issues**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

### Logs
```bash
# Backend logs
npm run start:dev

# Docker logs
docker-compose logs -f backend
docker-compose logs -f postgres
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in `docs/`
- Review the troubleshooting section above