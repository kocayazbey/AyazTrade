#!/bin/bash

# AyazTrade Project Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Starting AyazTrade project setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. You'll need Docker for the complete setup."
    else
        print_success "Docker $(docker --version) is installed"
    fi
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    cd "$(dirname "$0")/.."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the project root?"
        exit 1
    fi
    
    npm install
    print_success "Backend dependencies installed"
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    
    # Admin panel
    if [ -d "frontend/admin" ]; then
        print_status "Installing admin panel dependencies..."
        cd frontend/admin
        npm install
        cd ../..
        print_success "Admin panel dependencies installed"
    fi
    
    # Storefront
    if [ -d "frontend/storefront" ]; then
        print_status "Installing storefront dependencies..."
        cd frontend/storefront
        npm install
        cd ../..
        print_success "Storefront dependencies installed"
    fi
    
    # B2B Portal
    if [ -d "frontend/b2b-portal" ]; then
        print_status "Installing B2B portal dependencies..."
        cd frontend/b2b-portal
        npm install
        cd ../..
        print_success "B2B portal dependencies installed"
    fi
}

# Create environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success "Created .env file from env.example"
        else
            print_warning "env.example not found. Please create .env file manually."
        fi
    else
        print_success ".env file already exists"
    fi
    
    # Create frontend .env files
    for frontend in admin storefront b2b-portal; do
        if [ -d "frontend/$frontend" ]; then
            if [ ! -f "frontend/$frontend/.env.local" ]; then
                cat > "frontend/$frontend/.env.local" << EOF
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=AyazTrade
EOF
                print_success "Created .env.local for $frontend"
            fi
        fi
    done
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if PostgreSQL is running
    if command -v psql &> /dev/null; then
        print_status "PostgreSQL is available"
    else
        print_warning "PostgreSQL not found. Please install PostgreSQL or use Docker."
    fi
    
    # Generate Prisma client
    if [ -f "prisma/schema.prisma" ]; then
        print_status "Generating Prisma client..."
        npx prisma generate
        print_success "Prisma client generated"
    fi
    
    # Run database migrations
    print_status "Running database migrations..."
    if [ -f "drizzle.config.ts" ]; then
        npm run db:generate
        print_success "Database migrations generated"
    fi
}

# Build project
build_project() {
    print_status "Building project..."
    
    # Build backend
    print_status "Building backend..."
    npm run build
    print_success "Backend built successfully"
    
    # Build frontend applications
    for frontend in admin storefront b2b-portal; do
        if [ -d "frontend/$frontend" ]; then
            print_status "Building $frontend..."
            cd "frontend/$frontend"
            npm run build
            cd ../..
            print_success "$frontend built successfully"
        fi
    done
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Backend tests
    if [ -d "test" ]; then
        print_status "Running backend tests..."
        npm run test
        print_success "Backend tests completed"
    fi
    
    # Frontend tests
    for frontend in admin storefront b2b-portal; do
        if [ -d "frontend/$frontend" ] && [ -f "frontend/$frontend/package.json" ]; then
            if grep -q '"test"' "frontend/$frontend/package.json"; then
                print_status "Running $frontend tests..."
                cd "frontend/$frontend"
                npm test -- --passWithNoTests
                cd ../..
                print_success "$frontend tests completed"
            fi
        fi
    done
}

# Main setup function
main() {
    echo "🎯 AyazTrade Project Setup"
    echo "=========================="
    
    check_node
    check_docker
    install_backend_deps
    install_frontend_deps
    setup_environment
    setup_database
    build_project
    run_tests
    
    echo ""
    print_success "🎉 AyazTrade project setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Start the database: docker-compose up postgres redis -d"
    echo "2. Run migrations: npm run db:push"
    echo "3. Start backend: npm run start:dev"
    echo "4. Start frontend: npm run dev"
    echo ""
    echo "🌐 Available services:"
    echo "- Backend API: http://localhost:3000"
    echo "- Admin Panel: http://localhost:5001"
    echo "- Storefront: http://localhost:5002"
    echo "- B2B Portal: http://localhost:5003"
    echo ""
    echo "📚 Documentation: docs/"
    echo "🧪 Tests: npm run test"
    echo "🐳 Docker: docker-compose up --build"
}

# Run main function
main "$@"
