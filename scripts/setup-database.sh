#!/bin/bash

# Database setup script for E-Rechnung Tool

set -e

echo "🗄️  Setting up E-Rechnung Tool database..."

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on localhost:5432"
    echo "Please start PostgreSQL first:"
    echo "  - Install PostgreSQL 15+"
    echo "  - Start the service"
    echo "  - Or use Docker: docker run -d --name postgres -e POSTGRES_PASSWORD=einvoice -p 5432:5432 postgres:15"
    exit 1
fi

# Database configuration
DB_NAME="einvoice"
DB_USER="einvoice"
DB_PASSWORD="einvoice"
DB_HOST="localhost"
DB_PORT="5432"

echo "📊 Database configuration:"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Create database and user
echo "🔧 Creating database and user..."

# Create user and database (run as postgres superuser)
psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User $DB_USER already exists"
psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || echo "Database $DB_NAME already exists"
psql -h $DB_HOST -p $DB_PORT -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Run migrations
echo "📝 Running database migrations..."

# Set environment variable for migrations
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Run initial schema migration
psql $DATABASE_URL -f packages/api/drizzle/0001_initial_schema.sql

# Run seed data migration
psql $DATABASE_URL -f packages/api/drizzle/0002_seed_data.sql

echo "✅ Database setup complete!"
echo ""
echo "📋 Test credentials:"
echo "  Email: admin@acme-consulting.de"
echo "  Password: admin123"
echo "  API Key: pdm_live_test_secret_123"
echo ""
echo "🔗 Connection string:"
echo "  $DATABASE_URL"
echo ""
echo "Next steps:"
echo "1. Update .env with DATABASE_URL"
echo "2. Start the API server: pnpm dev"
echo "3. Test the API: curl http://localhost:3000/health"
