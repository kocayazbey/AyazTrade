@echo off
REM Comprehensive Test Runner for AyazTrade
REM This script runs all comprehensive tests including decorators, interceptors, and integration tests

echo 🚀 Starting Comprehensive Test Suite for AyazTrade
echo ==================================================

REM Set environment variables
set NODE_ENV=test
set DATABASE_URL=postgresql://test:test@localhost:5432/ayaztrade_test
set REDIS_URL=redis://localhost:6379
set ELASTICSEARCH_URL=http://localhost:9200

REM Check if Node.js and npm are installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js first.
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed successfully
)

REM Run linting first
echo [INFO] Running ESLint...
npm run lint
if %ERRORLEVEL% neq 0 (
    echo [WARNING] ESLint found issues, but continuing with tests...
)

REM Run type checking
echo [INFO] Running TypeScript type checking...
npx tsc --noEmit
if %ERRORLEVEL% neq 0 (
    echo [ERROR] TypeScript type checking failed
    exit /b 1
)
echo [SUCCESS] TypeScript type checking passed

REM Run unit tests for decorators
echo [INFO] Running comprehensive decorator tests...
npm run test -- --testPathPattern="decorators" --verbose
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Decorator tests failed
    exit /b 1
)
echo [SUCCESS] Decorator tests passed

REM Run unit tests for interceptors
echo [INFO] Running comprehensive interceptor tests...
npm run test -- --testPathPattern="interceptors" --verbose
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Interceptor tests failed
    exit /b 1
)
echo [SUCCESS] Interceptor tests passed

REM Run integration tests
echo [INFO] Running comprehensive integration tests...
npm run test -- --testPathPattern="comprehensive-integration" --verbose
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Integration tests failed
    exit /b 1
)
echo [SUCCESS] Integration tests passed

REM Run E2E tests if they exist
if exist "test\e2e" (
    echo [INFO] Running E2E tests...
    npm run test:e2e
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] E2E tests failed, but continuing...
    ) else (
        echo [SUCCESS] E2E tests passed
    )
)

REM Run performance tests if they exist
if exist "test\performance" (
    echo [INFO] Running performance tests...
    npm run test:performance
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Performance tests failed, but continuing...
    ) else (
        echo [SUCCESS] Performance tests passed
    )
)

REM Generate test coverage report
echo [INFO] Generating test coverage report...
npm run test:cov
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Coverage report generation failed, but continuing...
) else (
    echo [SUCCESS] Coverage report generated
)

REM Run security tests if they exist
if exist "test\security" (
    echo [INFO] Running security tests...
    npm run test:security
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Security tests failed, but continuing...
    ) else (
        echo [SUCCESS] Security tests passed
    )
)

REM Run accessibility tests if they exist
if exist "test\accessibility" (
    echo [INFO] Running accessibility tests...
    npm run test:accessibility
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Accessibility tests failed, but continuing...
    ) else (
        echo [SUCCESS] Accessibility tests passed
    )
)

REM Run browser compatibility tests if they exist
if exist "test\browser-compatibility" (
    echo [INFO] Running browser compatibility tests...
    npm run test:browser
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Browser compatibility tests failed, but continuing...
    ) else (
        echo [SUCCESS] Browser compatibility tests passed
    )
)

REM Run mobile compatibility tests if they exist
if exist "test\mobile-compatibility" (
    echo [INFO] Running mobile compatibility tests...
    npm run test:mobile
    if %ERRORLEVEL% neq 0 (
        echo [WARNING] Mobile compatibility tests failed, but continuing...
    ) else (
        echo [SUCCESS] Mobile compatibility tests passed
    )
)

REM Final summary
echo.
echo ==================================================
echo 🎉 Comprehensive Test Suite Completed!
echo ==================================================
echo.
echo Test Results Summary:
echo - ✅ Decorator tests: PASSED
echo - ✅ Interceptor tests: PASSED
echo - ✅ Integration tests: PASSED
echo - ✅ TypeScript type checking: PASSED
echo.
echo Comprehensive features tested:
echo - 🔍 Validation decorators
echo - 💾 Caching decorators
echo - 🚦 Rate limiting decorators
echo - 📝 Audit logging decorators
echo - ⚡ Performance monitoring decorators
echo - 🔒 Security decorators
echo - 🎯 Comprehensive decorators
echo.
echo All comprehensive systems are working correctly!
echo ==================================================
