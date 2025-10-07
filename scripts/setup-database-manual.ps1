# Manual database setup commands for E-Rechnung Tool
# Run these commands one by one in PowerShell

Write-Host "🗄️  Manual Database Setup for E-Rechnung Tool" -ForegroundColor Green
Write-Host ""
Write-Host "Run these commands one by one:" -ForegroundColor Yellow
Write-Host ""

# Database configuration
$DB_NAME = "einvoice"
$DB_USER = "einvoice"
$DB_PASSWORD = "einvoice"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$PSQL_PATH = "C:\Program Files\PostgreSQL\15\bin\psql.exe"

Write-Host "1. Check PostgreSQL service:" -ForegroundColor Cyan
Write-Host "   Get-Service -Name 'postgresql-x64-15'" -ForegroundColor White
Write-Host ""

Write-Host "2. Create user:" -ForegroundColor Cyan
Write-Host "   & '$PSQL_PATH' -h $DB_HOST -p $DB_PORT -U postgres -c 'CREATE USER $DB_USER WITH PASSWORD ''$DB_PASSWORD'';'" -ForegroundColor White
Write-Host ""

Write-Host "3. Create database:" -ForegroundColor Cyan
Write-Host "   & '$PSQL_PATH' -h $DB_HOST -p $DB_PORT -U postgres -c 'CREATE DATABASE $DB_NAME OWNER $DB_USER;'" -ForegroundColor White
Write-Host ""

Write-Host "4. Grant privileges:" -ForegroundColor Cyan
Write-Host "   & '$PSQL_PATH' -h $DB_HOST -p $DB_PORT -U postgres -c 'GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;'" -ForegroundColor White
Write-Host ""

Write-Host "5. Run schema migration:" -ForegroundColor Cyan
Write-Host "   & '$PSQL_PATH' postgresql://$DB_USER`:$DB_PASSWORD@$DB_HOST`:$DB_PORT/$DB_NAME -f 'packages/api/drizzle/0001_initial_schema.sql'" -ForegroundColor White
Write-Host ""

Write-Host "6. Run seed data migration:" -ForegroundColor Cyan
Write-Host "   & '$PSQL_PATH' postgresql://$DB_USER`:$DB_PASSWORD@$DB_HOST`:$DB_PORT/$DB_NAME -f 'packages/api/drizzle/0002_seed_data.sql'" -ForegroundColor White
Write-Host ""

Write-Host "📋 After setup, test credentials:" -ForegroundColor Cyan
Write-Host "   Email: admin@acme-consulting.de" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host "   API Key: pdm_live_test_secret_123" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Connection string:" -ForegroundColor Cyan
Write-Host "   postgresql://$DB_USER`:$DB_PASSWORD@$DB_HOST`:$DB_PORT/$DB_NAME" -ForegroundColor White
