@echo off
REM Database setup script for E-Rechnung Tool (Windows)

echo 🗄️  Setting up E-Rechnung Tool database...

REM Check if PostgreSQL is running
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL 15+ from https://www.postgresql.org/download/
    pause
    exit /b 1
)

REM Database configuration
set DB_NAME=einvoice
set DB_USER=einvoice
set DB_PASSWORD=einvoice
set DB_HOST=localhost
set DB_PORT=5432

echo 📊 Database configuration:
echo   Host: %DB_HOST%:%DB_PORT%
echo   Database: %DB_NAME%
echo   User: %DB_USER%

REM Create database and user
echo 🔧 Creating database and user...

REM Create user and database (run as postgres superuser)
psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';" 2>nul || echo User %DB_USER% already exists
psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "CREATE DATABASE %DB_NAME% OWNER %DB_USER%;" 2>nul || echo Database %DB_NAME% already exists
psql -h %DB_HOST% -p %DB_PORT% -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;"

REM Run migrations
echo 📝 Running database migrations...

REM Set environment variable for migrations
set DATABASE_URL=postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%

REM Run initial schema migration
psql %DATABASE_URL% -f packages/api/drizzle/0001_initial_schema.sql

REM Run seed data migration
psql %DATABASE_URL% -f packages/api/drizzle/0002_seed_data.sql

echo ✅ Database setup complete!
echo.
echo 📋 Test credentials:
echo   Email: admin@acme-consulting.de
echo   Password: admin123
echo   API Key: pdm_live_test_secret_123
echo.
echo 🔗 Connection string:
echo   %DATABASE_URL%
echo.
echo Next steps:
echo 1. Update .env with DATABASE_URL
echo 2. Start the API server: pnpm dev
echo 3. Test the API: curl http://localhost:3000/health

pause
