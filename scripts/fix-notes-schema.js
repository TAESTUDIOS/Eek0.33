/**
 * scripts/fix-notes-schema.js
 * Fix the notes table schema to match our requirements
 */

const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dDp7FPYcAJo9@ep-square-tooth-ag413pli-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function fixSchema() {
  console.log('🔧 Fixing notes table schema...\n');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Check current notes table structure
    console.log('📊 Current notes table structure:');
    const currentCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notes'
      ORDER BY ordinal_position
    `;
    currentCols.forEach(c => console.log(`   - ${c.column_name}: ${c.data_type}`));
    
    console.log('\n🔄 Dropping old notes table and creating new one...');
    
    // Drop and recreate notes table with correct schema
    await sql`DROP TABLE IF EXISTS notes CASCADE`;
    console.log('✅ Dropped old notes table');
    
    await sql`
      CREATE TABLE notes (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(500) NOT NULL DEFAULT 'Untitled',
        content TEXT NOT NULL DEFAULT '',
        folder_id VARCHAR(50) REFERENCES folders(id) ON DELETE SET NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      )
    `;
    console.log('✅ Created new notes table');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)`;
    console.log('✅ Created indexes');
    
    // Verify new structure
    console.log('\n📊 New notes table structure:');
    const newCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notes'
      ORDER BY ordinal_position
    `;
    newCols.forEach(c => console.log(`   - ${c.column_name}: ${c.data_type}`));
    
    console.log('\n✅ Schema fixed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixSchema();
