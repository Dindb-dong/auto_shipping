#!/usr/bin/env node

/**
 * Database Schema Application Script
 * 
 * This script applies the database schema to the Supabase database.
 * Run this script after setting up your database connection.
 * 
 * Usage:
 *   node scripts/apply-schema.js
 * 
 * Environment variables required:
 *   - DATABASE_HOST
 *   - DATABASE_PORT
 *   - DATABASE_NAME
 *   - DATABASE_USER
 *   - DATABASE_PASSWORD
 */

const fs = require('fs');
const path = require('path');

// Add the server directory to the module path to find pg
const serverPath = path.join(__dirname, '..', 'server');
require.main.paths.unshift(path.join(serverPath, 'node_modules'));

// Load environment variables from .env file
const envPath = path.join(serverPath, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

const { Pool } = require('pg');

// Database configuration
const getDatabaseConfig = () => {
  console.log('🔍 Database configuration:');
  console.log('  Host:', process.env.DATABASE_HOST || 'Not set');
  console.log('  Port:', process.env.DATABASE_PORT || 'Not set');
  console.log('  Database:', process.env.DATABASE_NAME || 'Not set');
  console.log('  User:', process.env.DATABASE_USER || 'Not set');
  console.log('  Password:', process.env.DATABASE_PASSWORD ? 'Set' : 'Not set');

  if (!process.env.DATABASE_HOST || !process.env.DATABASE_NAME || !process.env.DATABASE_USER || !process.env.DATABASE_PASSWORD) {
    throw new Error('Missing required database environment variables');
  }

  const isSupabase = process.env.DATABASE_HOST && process.env.DATABASE_HOST.includes('supabase.co');
  let finalHost = process.env.DATABASE_HOST;
  let finalPort = parseInt(process.env.DATABASE_PORT || '5432');

  if (isSupabase) {
    console.log('🔒 Using Supabase configuration');
    
    if (process.env.DATABASE_HOST.includes('pooler.supabase.com')) {
      finalHost = process.env.DATABASE_HOST;
      finalPort = 6543;
      console.log('🔄 Using Supabase Transaction pooler');
    } else {
      finalHost = process.env.DATABASE_HOST.replace('db.', 'aws-1-ap-northeast-2.pooler.');
      finalPort = 6543;
      console.log('🔄 Converting to Supabase Transaction pooler');
    }
  }

  const sslConfig = isSupabase
    ? { rejectUnauthorized: false }
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false);

  return {
    host: finalHost,
    port: finalPort,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: sslConfig,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5,
  };
};

async function applySchema() {
  const pool = new Pool(getDatabaseConfig());
  
  try {
    console.log('🔄 Testing database connection...');
    const client = await pool.connect();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful');
    client.release();

    console.log('📄 Reading schema file...');
    const schemaPath = path.join(__dirname, '..', 'server', 'supabase-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔄 Applying database schema...');
    const result = await pool.query(schema);
    console.log('✅ Database schema applied successfully');
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if oauth_tokens table exists
    const oauthTokensCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'oauth_tokens'
      )
    `);
    
    if (oauthTokensCheck.rows[0].exists) {
      console.log('✅ oauth_tokens table exists');
    } else {
      console.log('❌ oauth_tokens table not found');
    }
    
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  applySchema().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { applySchema };
