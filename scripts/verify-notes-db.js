/**
 * scripts/verify-notes-db.js
 * Verify the notes database schema
 */

const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dDp7FPYcAJo9@ep-square-tooth-ag413pli-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function verify() {
  console.log('🔍 Verifying notes database schema...\n');
  
  try {
    const sql = neon(DATABASE_URL);
    
    // Check tables
    console.log('📋 Tables:');
    const tables = await sql`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('notes', 'folders')
      ORDER BY table_name
    `;
    tables.forEach(t => console.log(`   ✓ ${t.table_name} (${t.column_count} columns)`));
    
    // Check columns for folders
    console.log('\n📊 Folders table columns:');
    const folderCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'folders'
      ORDER BY ordinal_position
    `;
    folderCols.forEach(c => console.log(`   - ${c.column_name}: ${c.data_type}`));
    
    // Check columns for notes
    console.log('\n📊 Notes table columns:');
    const noteCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notes'
      ORDER BY ordinal_position
    `;
    noteCols.forEach(c => console.log(`   - ${c.column_name}: ${c.data_type}`));
    
    // Check indexes
    console.log('\n🔗 Indexes:');
    const indexes = await sql`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('notes', 'folders')
      ORDER BY tablename, indexname
    `;
    indexes.forEach(i => console.log(`   - ${i.indexname} on ${i.tablename}`));
    
    // Check data
    console.log('\n📈 Current data:');
    const noteCount = await sql`SELECT COUNT(*) as count FROM notes`;
    const folderCount = await sql`SELECT COUNT(*) as count FROM folders`;
    console.log(`   - Notes: ${noteCount[0].count}`);
    console.log(`   - Folders: ${folderCount[0].count}`);
    
    if (noteCount[0].count > 0) {
      console.log('\n📝 Sample notes:');
      const sampleNotes = await sql`SELECT id, title, folder_id FROM notes LIMIT 3`;
      sampleNotes.forEach(n => console.log(`   - ${n.title} (${n.id})`));
    }
    
    if (folderCount[0].count > 0) {
      console.log('\n📁 Sample folders:');
      const sampleFolders = await sql`SELECT id, name, parent_id FROM folders LIMIT 3`;
      sampleFolders.forEach(f => console.log(`   - ${f.name} (${f.id})`));
    }
    
    console.log('\n✅ Database schema verified successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verify();
