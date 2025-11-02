import { hotels } from './mocks/hotels.ts';

interface MigrationStats {
  total: number;
  success: number;
  skipped: number;
}

async function generateSQLForHotel(hotelId: string): Promise<string[]> {
  const statements: string[] = [];
  const outputDir = `./output/${hotelId}`;

  try {
    // Read all JSON files for this hotel
    const files: string[] = [];
    for await (const entry of Deno.readDir(outputDir)) {
      if (entry.isFile && entry.name.endsWith('.json')) {
        files.push(entry.name);
      }
    }

    console.log(`📂 Processing hotel ${hotelId} (${files.length} dates)...`);

    for (const file of files) {
      const date = file.replace('.json', '');
      const filePath = `${outputDir}/${file}`;

      try {
        const fileContent = await Deno.readTextFile(filePath);
        const data = JSON.parse(fileContent);

        // Skip empty data files
        if (!data || Object.keys(data).length === 0) {
          console.log(`⏭️  Skipping empty data for hotel ${hotelId} on ${date}`);
          continue;
        }

        // Escape single quotes in JSON string for SQL
        const jsonString = JSON.stringify(data).replace(/'/g, "''");

        // Generate INSERT statement with ON CONFLICT clause
        const sql = `INSERT INTO hotels (hotel_id, check_in_date, data)
VALUES ('${hotelId}', '${date}', '${jsonString}'::jsonb)
ON CONFLICT (hotel_id, check_in_date)
DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`;

        statements.push(sql);
        console.log(`✅ Generated SQL for hotel ${hotelId} on ${date}`);
      } catch (error) {
        console.error(`❌ Error reading file ${filePath}:`, error);
      }
    }
  } catch (error) {
    console.error(`❌ Error processing hotel ${hotelId}:`, error);
  }

  return statements;
}

async function generateMigrationSQL() {
  const stats: MigrationStats = {
    total: 0,
    success: 0,
    skipped: 0,
  };

  console.log('🚀 Starting SQL generation...\n');

  let allStatements: string[] = [];

  // Add header comment
  allStatements.push('-- Generated migration SQL for hotel data');
  allStatements.push('-- Run this in your Supabase SQL Editor\n');
  allStatements.push('-- Start transaction');
  allStatements.push('BEGIN;\n');

  for (const { hotelId } of hotels) {
    try {
      // Check if directory exists
      const dirInfo = await Deno.stat(`./output/${hotelId}`).catch(() => null);
      if (!dirInfo || !dirInfo.isDirectory) {
        console.log(`⏩ Skipping hotel ${hotelId} (no data directory)\n`);
        continue;
      }

      const statements = await generateSQLForHotel(hotelId.toString());

      if (statements.length > 0) {
        // Add comment for this hotel
        allStatements.push(`\n-- Hotel ID: ${hotelId} (${statements.length} dates)`);
        allStatements.push(...statements);
        allStatements.push(''); // blank line

        stats.success += statements.length;
      }

      stats.total += statements.length;
      console.log(`✅ Completed hotel ${hotelId}\n`);
    } catch (error) {
      console.error(`❌ Error processing hotel ${hotelId}:`, error);
    }
  }

  // Add commit
  allStatements.push('\n-- Commit transaction');
  allStatements.push('COMMIT;');

  // Write to file
  const outputFile = './migration.sql';
  await Deno.writeTextFile(outputFile, allStatements.join('\n'));

  // Print summary
  console.log('\n📊 Generation Summary:');
  console.log(`   Total statements: ${stats.total}`);
  console.log(`   ✅ Success: ${stats.success}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped}`);
  console.log(`\n💾 SQL file written to: ${outputFile}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Open your Supabase dashboard`);
  console.log(`   2. Go to SQL Editor`);
  console.log(`   3. Copy and paste the contents of ${outputFile}`);
  console.log(`   4. Click "Run" to execute the migration`);
  console.log(`\n🎉 SQL generation complete!`);
}

// Run generation
generateMigrationSQL();
