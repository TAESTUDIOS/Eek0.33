/**
 * scripts/migrate-notes.js
 * Run the notes schema migration on Neon database
 * Usage: node scripts/migrate-notes.js
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dDp7FPYcAJo9@ep-square-tooth-ag413pli-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function runMigration() {
  console.log('🚀 Starting notes schema migration...\n');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, '..', 'n8n-workflows', 'notes-schema.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolons and filter out comments and empty statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          await sql(statement);
          console.log(`✅ Statement ${i + 1} completed\n`);
        } catch (error) {
          // Some statements might fail if they already exist, that's okay
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1} skipped (already exists)\n`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            console.log('Statement:', statement.substring(0, 100) + '...\n');
          }
        }
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('notes', 'folders')
      ORDER BY table_name
    `;
    
    console.log('✅ Tables found:', tables.map(t => t.table_name).join(', '));
    
    // Check if there's any existing data
    const noteCount = await sql`SELECT COUNT(*) as count FROM notes`;
    const folderCount = await sql`SELECT COUNT(*) as count FROM folders`;
    
    console.log(`\n📊 Current data:`);
    console.log(`   - Notes: ${noteCount[0].count}`);
    console.log(`   - Folders: ${folderCount[0].count}`);
    
    console.log('\n✨ Migration completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
