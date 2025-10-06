#!/bin/bash

# Development setup script for E-Rechnung Tool

set -e

echo "🚀 Setting up E-Rechnung Tool development environment..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is required. Install with: npm install -g pnpm"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build all packages
echo "🔨 Building packages..."
pnpm build

# Run tests
echo "🧪 Running tests..."
pnpm test

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ Created .env file. Please update with your configuration."
fi

# Create data directory
echo "📁 Creating data directory..."
mkdir -p .data

echo "✅ Development environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your database and configuration"
echo "2. Run 'pnpm db:migrate' to set up the database"
echo "3. Run 'pnpm dev' to start the API server"
echo "4. Run 'pnpm validate examples/invoices/sample-xrechnung-ubl.xml' to test CLI"
echo ""
echo "Happy coding! 🎉"
