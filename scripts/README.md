# Scripts Directory

This directory contains utility scripts for the Auto Shipping system.

## Available Scripts

### 1. `apply-schema.sh` / `apply-schema.js`

Applies the database schema to your Supabase database. This script creates all the necessary tables, indexes, and views.

**Usage:**

```bash
# From project root
./scripts/apply-schema.sh

# Or directly with Node.js
cd server
node ../scripts/apply-schema.js
```

**Prerequisites:**

- Database environment variables must be set:
  - `DATABASE_HOST`
  - `DATABASE_PORT`
  - `DATABASE_NAME`
  - `DATABASE_USER`
  - `DATABASE_PASSWORD`

**What it does:**

- Tests database connection
- Reads `server/supabase-schema.sql`
- Applies the schema to create tables:
  - `oauth_tokens` - OAuth token storage
  - `shipment_logs` - Shipping tracking logs
  - `login_logs` - Login attempt logs
- Creates indexes and views
- Verifies tables were created successfully

### 2. `setup.sh`

Sets up the local development environment.

**Usage:**

```bash
./scripts/setup.sh
```

**What it does:**

- Checks Node.js version
- Installs backend and frontend dependencies
- Creates `.env` files from examples
- Initializes Git repository (optional)

### 3. `quick-start.sh`

Quick setup script for development.

**Usage:**

```bash
./scripts/quick-start.sh
```

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. **Check environment variables:**

   ```bash
   echo $DATABASE_HOST
   echo $DATABASE_USER
   # etc.
   ```

2. **For Supabase users:**

   - Use the Transaction pooler host: `aws-1-ap-northeast-2.pooler.supabase.com`
   - Use port `6543` (not 5432)
   - Ensure SSL is enabled

3. **For Railway users:**
   - Use internal host: `postgres.railway.internal`
   - Use port `5432`

### Schema Application Issues

If schema application fails:

1. **Check database permissions:**

   - Ensure your database user has CREATE TABLE permissions
   - Check if tables already exist (script will handle this gracefully)

2. **Check SQL syntax:**

   - The schema file uses PostgreSQL syntax
   - Some features might not be available in all PostgreSQL versions

3. **Manual application:**
   - Copy the contents of `server/supabase-schema.sql`
   - Paste into your database's SQL editor (Supabase, pgAdmin, etc.)
   - Execute manually

## Environment Variables Reference

### Database Configuration

```env
# Supabase (recommended)
DATABASE_HOST=aws-1-ap-northeast-2.pooler.supabase.com
DATABASE_PORT=6543
DATABASE_NAME=postgres
DATABASE_USER=postgres.your_project_ref
DATABASE_PASSWORD=your_supabase_password

# Railway PostgreSQL
DATABASE_HOST=postgres.railway.internal
DATABASE_PORT=5432
DATABASE_NAME=railway
DATABASE_USER=postgres
DATABASE_PASSWORD=your_railway_password
```

### Application Configuration

```env
NODE_ENV=production
PORT=3000

# Cafe24 API
MALL_ID=your_mall_id
CAFE24_CLIENT_ID=your_client_id
CAFE24_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=https://your-app.railway.app/oauth/callback

# Security
PARTNER_API_KEY=your_partner_api_key

# URLs
FRONTEND_URL=https://your-frontend.netlify.app
BACKEND_URL=https://your-app.railway.app
```

## Support

If you encounter issues:

1. Check the logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure your database user has the necessary permissions
4. Check the main project README.md for additional setup instructions
