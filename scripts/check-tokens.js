#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Add the server directory to the module path to find pg
const serverPath = path.join(__dirname, '..', 'server');
require.main.paths.unshift(path.join(serverPath, 'node_modules'));

const { Pool } = require('pg');

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', 'server', '.env');
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

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function checkTokens() {
  try {
    console.log('🔍 Checking OAuth tokens in database...');
    const result = await pool.query('SELECT * FROM oauth_tokens ORDER BY created_at DESC');
    
    if (result.rows.length === 0) {
      console.log('❌ No OAuth tokens found in database');
      console.log('💡 This means the OAuth flow needs to be completed');
    } else {
      console.log(`📊 Found ${result.rows.length} OAuth token(s):`);
      result.rows.forEach((row, index) => {
        console.log(`\n${index + 1}. Mall ID: ${row.mall_id}`);
        console.log(`   Provider: ${row.provider}`);
        console.log(`   Created: ${row.created_at}`);
        console.log(`   Expires: ${row.expires_at}`);
        console.log(`   Has Access Token: ${row.access_token ? 'Yes' : 'No'}`);
        console.log(`   Has Refresh Token: ${row.refresh_token ? 'Yes' : 'No'}`);
        
        // Check if token is expired
        const now = new Date();
        const expiresAt = new Date(row.expires_at);
        if (now > expiresAt) {
          console.log(`   ⚠️  Token is EXPIRED`);
        } else {
          console.log(`   ✅ Token is valid`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error checking tokens:', error.message);
  } finally {
    await pool.end();
  }
}

checkTokens();
