#!/bin/bash

# Database Schema Application Script
# This script applies the database schema to the Supabase database

set -e

echo "🚀 Applying database schema..."

# Check if we're in the right directory
if [ ! -f "server/supabase-schema.sql" ]; then
    echo "❌ Error: supabase-schema.sql not found. Please run this script from the project root."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if we're in the server directory or need to change to it
if [ -f "package.json" ] && [ -d "server" ]; then
    echo "📁 Running from project root"
    cd server
elif [ -f "package.json" ] && [ -f "supabase-schema.sql" ]; then
    echo "📁 Running from server directory"
else
    echo "❌ Error: Please run this script from the project root or server directory"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Make sure database environment variables are set."
    echo "   Required variables:"
    echo "   - DATABASE_HOST"
    echo "   - DATABASE_PORT"
    echo "   - DATABASE_NAME"
    echo "   - DATABASE_USER"
    echo "   - DATABASE_PASSWORD"
    echo ""
    echo "   You can either:"
    echo "   1. Create a .env file with these variables"
    echo "   2. Set them as environment variables in your shell"
    echo "   3. Set them in your deployment platform (Railway, etc.)"
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the schema application script
echo "🔄 Applying schema..."
node ../scripts/apply-schema.js

echo "✅ Schema application completed!"
echo ""
echo "Next steps:"
echo "1. Test your application endpoints"
echo "2. Check the logs to ensure everything is working"
echo "3. If you're using Railway, check the deployment logs"
