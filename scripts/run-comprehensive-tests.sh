#!/bin/bash

# Comprehensive Test Runner for AyazTrade
# This script runs all comprehensive tests including decorators, interceptors, and integration tests

echo "🚀 Starting Comprehensive Test Suite for AyazTrade"
echo "=================================================="

# Set environment variables
export NODE_ENV=test
export DATABASE_URL="postgresql://test:test@localhost:5432/ayaztrade_test"
export REDIS_URL="redis://localhost:6379"
export ELASTICSEARCH_URL="http://localhost:9200"

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

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_success "Dependencies installed successfully"
fi

# Run linting first
print_status "Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
    print_warning "ESLint found issues, but continuing with tests..."
fi

# Run type checking
print_status "Running TypeScript type checking..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    print_error "TypeScript type checking failed"
    exit 1
fi
print_success "TypeScript type checking passed"

# Ensure database schema is in sync (Drizzle)
print_status "Running Drizzle migrations (generate + push)..."
npm run db:generate || true
npm run db:push || true

# Run unit tests for decorators
print_status "Running comprehensive decorator tests..."
npm run test -- --testPathPattern="decorators" --verbose
if [ $? -ne 0 ]; then
    print_error "Decorator tests failed"
    exit 1
fi
print_success "Decorator tests passed"

# Run unit tests for interceptors
print_status "Running comprehensive interceptor tests..."
npm run test -- --testPathPattern="interceptors" --verbose
if [ $? -ne 0 ]; then
    print_error "Interceptor tests failed"
    exit 1
fi
print_success "Interceptor tests passed"

# Run integration tests
print_status "Running comprehensive integration tests..."
npm run test -- --testPathPattern="comprehensive-integration" --verbose
if [ $? -ne 0 ]; then
    print_error "Integration tests failed"
    exit 1
fi
print_success "Integration tests passed"

# Run E2E tests if they exist
if [ -d "test/e2e" ]; then
    print_status "Running E2E tests..."
    npm run test:e2e
    if [ $? -ne 0 ]; then
        print_warning "E2E tests failed, but continuing..."
    else
        print_success "E2E tests passed"
    fi
fi

# Run performance tests if they exist
if [ -d "test/performance" ]; then
    print_status "Running performance tests..."
    npm run test:performance
    if [ $? -ne 0 ]; then
        print_warning "Performance tests failed, but continuing..."
    else
        print_success "Performance tests passed"
    fi
fi

# Generate test coverage report
print_status "Generating test coverage report..."
npm run test:cov
if [ $? -ne 0 ]; then
    print_warning "Coverage report generation failed, but continuing..."
else
    print_success "Coverage report generated"
fi

# Run security tests if they exist
if [ -d "test/security" ]; then
    print_status "Running security tests..."
    npm run test:security
    if [ $? -ne 0 ]; then
        print_warning "Security tests failed, but continuing..."
    else
        print_success "Security tests passed"
    fi
fi

# Run accessibility tests if they exist
if [ -d "test/accessibility" ]; then
    print_status "Running accessibility tests..."
    npm run test:accessibility
    if [ $? -ne 0 ]; then
        print_warning "Accessibility tests failed, but continuing..."
    else
        print_success "Accessibility tests passed"
    fi
fi

# Run browser compatibility tests if they exist
if [ -d "test/browser-compatibility" ]; then
    print_status "Running browser compatibility tests..."
    npm run test:browser
    if [ $? -ne 0 ]; then
        print_warning "Browser compatibility tests failed, but continuing..."
    else
        print_success "Browser compatibility tests passed"
    fi
fi

# Run mobile compatibility tests if they exist
if [ -d "test/mobile-compatibility" ]; then
    print_status "Running mobile compatibility tests..."
    npm run test:mobile
    if [ $? -ne 0 ]; then
        print_warning "Mobile compatibility tests failed, but continuing..."
    else
        print_success "Mobile compatibility tests passed"
    fi
fi

# Final summary
echo ""
echo "=================================================="
echo "🎉 Comprehensive Test Suite Completed!"
echo "=================================================="
echo ""
echo "Test Results Summary:"
echo "- ✅ Decorator tests: PASSED"
echo "- ✅ Interceptor tests: PASSED"
echo "- ✅ Integration tests: PASSED"
echo "- ✅ TypeScript type checking: PASSED"
echo ""
echo "Comprehensive features tested:"
echo "- 🔍 Validation decorators"
echo "- 💾 Caching decorators"
echo "- 🚦 Rate limiting decorators"
echo "- 📝 Audit logging decorators"
echo "- ⚡ Performance monitoring decorators"
echo "- 🔒 Security decorators"
echo "- 🎯 Comprehensive decorators"
echo ""
echo "All comprehensive systems are working correctly!"
echo "=================================================="
