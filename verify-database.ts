/**
 * Verify that the normalized database tables exist and are accessible
 */

import { supabase } from './supabase-normalized.ts';

async function verifyDatabase() {
  console.log('🔍 Verifying database setup...\n');

  const tables = [
    'hotels',
    'hotel_daily_rates',
    'room_types',
    'room_rates',
    'hotel_images',
  ];

  let allTablesExist = true;

  for (const tableName of tables) {
    try {
      // Try to query the table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table '${tableName}': ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✅ Table '${tableName}': Accessible (${data?.length || 0} rows found)`);
      }
    } catch (err) {
      console.log(`❌ Table '${tableName}': ${err.message}`);
      allTablesExist = false;
    }
  }

  console.log('\n' + '='.repeat(60));

  if (allTablesExist) {
    console.log('\n✅ All tables exist and are accessible!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run the scraper: deno run --allow-all main.ts');
    console.log('   2. Check data was saved with this query:');
    console.log('      SELECT hotel_id, name, city FROM hotels;');
  } else {
    console.log('\n❌ Some tables are missing or not accessible!');
    console.log('\n📝 Action required:');
    console.log('   1. Run the database migration:');
    console.log('      psql $DATABASE_URL -f migrations/001_normalized_schema.sql');
    console.log('\n   Or copy/paste the SQL from migrations/001_normalized_schema.sql');
    console.log('   into Supabase SQL Editor and run it.');
    console.log('\n   See SETUP_INSTRUCTIONS.md for detailed steps.');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

verifyDatabase().catch((err) => {
  console.error('\n❌ Failed to verify database:', err.message);
  console.log('\nCheck your .env file:');
  console.log('  - SUPABASE_URL should be set');
  console.log('  - SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY should be set');
});
