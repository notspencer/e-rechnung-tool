# Database setup script for E-Rechnung Tool (PowerShell)

Write-Host "🗄️  Setting up E-Rechnung Tool database..." -ForegroundColor Green

# Database configuration
$DB_NAME = "einvoice"
$DB_USER = "einvoice"
$DB_PASSWORD = "einvoice"
$DB_HOST = "localhost"
$DB_PORT = "5432"

Write-Host "📊 Database configuration:" -ForegroundColor Cyan
Write-Host "  Host: $DB_HOST`:$DB_PORT" -ForegroundColor White
Write-Host "  Database: $DB_NAME" -ForegroundColor White
Write-Host "  User: $DB_USER" -ForegroundColor White

# Check if PostgreSQL is running
Write-Host "🔍 Checking PostgreSQL service..." -ForegroundColor Yellow
$service = Get-Service -Name "postgresql-x64-15" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host "✅ PostgreSQL service is running" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL service is not running" -ForegroundColor Red
    Write-Host "Please start PostgreSQL service manually" -ForegroundColor Yellow
    exit 1
}

# Set PostgreSQL bin path
$PSQL_PATH = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
if (-not (Test-Path $PSQL_PATH)) {
    Write-Host "❌ PostgreSQL not found at $PSQL_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Creating database and user..." -ForegroundColor Yellow

# Create user and database (run as postgres superuser)
Write-Host "Creating user $DB_USER..." -ForegroundColor White
& $PSQL_PATH -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ User $DB_USER created" -ForegroundColor Green
} else {
    Write-Host "ℹ️  User $DB_USER may already exist" -ForegroundColor Yellow
}

Write-Host "Creating database $DB_NAME..." -ForegroundColor White
& $PSQL_PATH -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database $DB_NAME created" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Database $DB_NAME may already exist" -ForegroundColor Yellow
}

Write-Host "Granting privileges..." -ForegroundColor White
& $PSQL_PATH -h $DB_HOST -p $DB_PORT -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Run migrations
Write-Host "📝 Running database migrations..." -ForegroundColor Yellow

# Set environment variable for migrations
$DATABASE_URL = "postgresql://$DB_USER`:$DB_PASSWORD@$DB_HOST`:$DB_PORT/$DB_NAME"

# Run initial schema migration
Write-Host "Running initial schema migration..." -ForegroundColor White
& $PSQL_PATH $DATABASE_URL -f "packages/api/drizzle/0001_initial_schema.sql"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Initial schema migration completed" -ForegroundColor Green
} else {
    Write-Host "❌ Initial schema migration failed" -ForegroundColor Red
    exit 1
}

# Run seed data migration
Write-Host "Running seed data migration..." -ForegroundColor White
& $PSQL_PATH $DATABASE_URL -f "packages/api/drizzle/0002_seed_data.sql"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Seed data migration completed" -ForegroundColor Green
} else {
    Write-Host "❌ Seed data migration failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Test credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@acme-consulting.de" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host "  API Key: pdm_live_test_secret_123" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Connection string:" -ForegroundColor Cyan
Write-Host "  $DATABASE_URL" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env with DATABASE_URL" -ForegroundColor White
Write-Host "2. Start the API server: pnpm dev" -ForegroundColor White
Write-Host "3. Test the API: curl http://localhost:3000/health" -ForegroundColor White

Read-Host "Press Enter to continue"
