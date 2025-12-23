#!/usr/bin/env node

/**
 * Migration runner for Supabase
 * Run this script to execute migration files in order
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigrations() {
  console.log('🚀 Starting Supabase migrations...\n');

  const migrationsDir = path.join(__dirname, '..', 'migrations');

  // Get all migration files sorted by name
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    console.log(`📄 Running migration: ${file}`);

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        console.error(`❌ Migration ${file} failed:`, error);
        process.exit(1);
      }

      console.log(`✅ Migration ${file} completed successfully\n`);
    } catch (error) {
      console.error(`❌ Migration ${file} failed:`, error);
      process.exit(1);
    }
  }

  console.log('🎉 All migrations completed successfully!');
}

runMigrations().catch(console.error);
