@echo off
REM AyazTrade Project Setup Script for Windows
REM This script sets up the complete development environment

echo 🚀 Starting AyazTrade project setup...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo [SUCCESS] Node.js is installed

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not available. Please install npm.
    exit /b 1
)

echo [SUCCESS] npm is available

REM Install backend dependencies
echo [INFO] Installing backend dependencies...
if not exist "package.json" (
    echo [ERROR] package.json not found. Are you in the project root?
    exit /b 1
)

npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    exit /b 1
)
echo [SUCCESS] Backend dependencies installed

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...

REM Admin panel
if exist "frontend\admin" (
    echo [INFO] Installing admin panel dependencies...
    cd frontend\admin
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install admin panel dependencies
        exit /b 1
    )
    cd ..\..
    echo [SUCCESS] Admin panel dependencies installed
)

REM Storefront
if exist "frontend\storefront" (
    echo [INFO] Installing storefront dependencies...
    cd frontend\storefront
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install storefront dependencies
        exit /b 1
    )
    cd ..\..
    echo [SUCCESS] Storefront dependencies installed
)

REM B2B Portal
if exist "frontend\b2b-portal" (
    echo [INFO] Installing B2B portal dependencies...
    cd frontend\b2b-portal
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install B2B portal dependencies
        exit /b 1
    )
    cd ..\..
    echo [SUCCESS] B2B portal dependencies installed
)

REM Create environment files
echo [INFO] Setting up environment files...

REM Create .env file if it doesn't exist
if not exist ".env" (
    if exist "env.example" (
        copy env.example .env
        echo [SUCCESS] Created .env file from env.example
    ) else (
        echo [WARNING] env.example not found. Please create .env file manually.
    )
) else (
    echo [SUCCESS] .env file already exists
)

REM Create frontend .env files
for %%f in (admin storefront b2b-portal) do (
    if exist "frontend\%%f" (
        if not exist "frontend\%%f\.env.local" (
            echo NEXT_PUBLIC_API_URL=http://localhost:3000 > "frontend\%%f\.env.local"
            echo NEXT_PUBLIC_APP_NAME=AyazTrade >> "frontend\%%f\.env.local"
            echo [SUCCESS] Created .env.local for %%f
        )
    )
)

REM Setup database
echo [INFO] Setting up database...

REM Generate Prisma client
if exist "prisma\schema.prisma" (
    echo [INFO] Generating Prisma client...
    npx prisma generate
    if %errorlevel% neq 0 (
        echo [WARNING] Failed to generate Prisma client
    ) else (
        echo [SUCCESS] Prisma client generated
    )
)

REM Run database migrations
if exist "drizzle.config.ts" (
    echo [INFO] Running database migrations...
    npm run db:generate
    if %errorlevel% neq 0 (
        echo [WARNING] Failed to generate database migrations
    ) else (
        echo [SUCCESS] Database migrations generated
    )
)

REM Build project
echo [INFO] Building project...

REM Build backend
echo [INFO] Building backend...
npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build backend
    exit /b 1
)
echo [SUCCESS] Backend built successfully

REM Build frontend applications
for %%f in (admin storefront b2b-portal) do (
    if exist "frontend\%%f" (
        echo [INFO] Building %%f...
        cd "frontend\%%f"
        npm run build
        if %errorlevel% neq 0 (
            echo [WARNING] Failed to build %%f
        ) else (
            echo [SUCCESS] %%f built successfully
        )
        cd ..\..
    )
)

REM Run tests
echo [INFO] Running tests...

REM Backend tests
if exist "test" (
    echo [INFO] Running backend tests...
    npm run test
    if %errorlevel% neq 0 (
        echo [WARNING] Some backend tests failed
    ) else (
        echo [SUCCESS] Backend tests completed
    )
)

echo.
echo [SUCCESS] 🎉 AyazTrade project setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Start the database: docker-compose up postgres redis -d
echo 2. Run migrations: npm run db:push
echo 3. Start backend: npm run start:dev
echo 4. Start frontend: npm run dev
echo.
echo 🌐 Available services:
echo - Backend API: http://localhost:3000
echo - Admin Panel: http://localhost:5001
echo - Storefront: http://localhost:5002
echo - B2B Portal: http://localhost:5003
echo.
echo 📚 Documentation: docs/
echo 🧪 Tests: npm run test
echo 🐳 Docker: docker-compose up --build

pause
