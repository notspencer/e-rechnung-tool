#!/bin/bash
# Database setup script for E-Rechnung Tool (Bash)

echo "🗄️  Setting up E-Rechnung Tool database..."

# Set UTF-8 encoding to avoid code page issues
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Database configuration
DB_NAME="einvoice"
DB_USER="einvoice"
DB_PASSWORD="einvoice"
DB_HOST="localhost"
DB_PORT="5432"
PSQL_PATH="C:/Program Files/PostgreSQL/15/bin/psql.exe"

echo "📊 Database configuration:"
echo "  Host: $DB_HOST:$DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL service..."
if sc query postgresql-x64-15 | grep -q "RUNNING"; then
    echo "✅ PostgreSQL service is running"
else
    echo "❌ PostgreSQL service is not running"
    echo "Please start PostgreSQL service manually"
    exit 1
fi

# Check if psql exists
if [ ! -f "$PSQL_PATH" ]; then
    echo "❌ PostgreSQL not found at $PSQL_PATH"
    exit 1
fi

echo "🔧 Creating database and user..."

# Create user and database (run as postgres superuser)
echo "Creating user $DB_USER..."
"$PSQL_PATH" -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ User $DB_USER created"
else
    echo "ℹ️  User $DB_USER may already exist"
fi

echo "Creating database $DB_NAME..."
"$PSQL_PATH" -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database $DB_NAME created"
else
    echo "ℹ️  Database $DB_NAME may already exist"
fi

echo "Granting privileges..."
"$PSQL_PATH" -h $DB_HOST -p $DB_PORT -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Run migrations
echo "📝 Running database migrations..."

# Set environment variable for migrations
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Run initial schema migration
echo "Running initial schema migration..."
"$PSQL_PATH" "$DATABASE_URL" -f "packages/api/drizzle/0001_initial_schema.sql"
if [ $? -eq 0 ]; then
    echo "✅ Initial schema migration completed"
else
    echo "❌ Initial schema migration failed"
    exit 1
fi

# Run seed data migration
echo "Running seed data migration..."
"$PSQL_PATH" "$DATABASE_URL" -f "packages/api/drizzle/0002_seed_data.sql"
if [ $? -eq 0 ]; then
    echo "✅ Seed data migration completed"
else
    echo "❌ Seed data migration failed"
    exit 1
fi

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

