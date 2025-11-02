import { hotels } from './mocks/hotels.ts';

interface MigrationStats {
  totalHotels: number;
  totalDates: number;
  skippedDates: number;
}

async function generateSQLForHotel(hotelId: string): Promise<{ statements: string[], count: number, skipped: number }> {
  const statements: string[] = [];
  let count = 0;
  let skipped = 0;
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
          skipped++;
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
        count++;
        console.log(`✅ Generated SQL for hotel ${hotelId} on ${date}`);
      } catch (error) {
        console.error(`❌ Error reading file ${filePath}:`, error);
        skipped++;
      }
    }
  } catch (error) {
    console.error(`❌ Error processing hotel ${hotelId}:`, error);
  }

  return { statements, count, skipped };
}

async function generateMigrationSQLPerHotel() {
  const stats: MigrationStats = {
    totalHotels: 0,
    totalDates: 0,
    skippedDates: 0,
  };

  console.log('🚀 Starting SQL generation (one file per hotel)...\n');

  // Create migrations directory
  try {
    await Deno.mkdir('./migrations', { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }

  const generatedFiles: string[] = [];

  for (const { hotelId } of hotels) {
    try {
      // Check if directory exists
      const dirInfo = await Deno.stat(`./output/${hotelId}`).catch(() => null);
      if (!dirInfo || !dirInfo.isDirectory) {
        console.log(`⏩ Skipping hotel ${hotelId} (no data directory)\n`);
        continue;
      }

      const { statements, count, skipped } = await generateSQLForHotel(hotelId.toString());

      if (statements.length > 0) {
        // Create SQL file for this hotel
        const hotelStatements: string[] = [];
        hotelStatements.push(`-- Migration SQL for Hotel ID: ${hotelId}`);
        hotelStatements.push(`-- Generated: ${new Date().toISOString()}`);
        hotelStatements.push(`-- Total dates: ${count}\n`);
        hotelStatements.push('BEGIN;\n');
        hotelStatements.push(...statements);
        hotelStatements.push('\nCOMMIT;');

        const outputFile = `./migrations/hotel_${hotelId}.sql`;
        await Deno.writeTextFile(outputFile, hotelStatements.join('\n'));

        generatedFiles.push(outputFile);
        stats.totalHotels++;
        stats.totalDates += count;
        stats.skippedDates += skipped;

        console.log(`💾 Wrote ${outputFile} (${count} dates)\n`);
      }

      console.log(`✅ Completed hotel ${hotelId}\n`);
    } catch (error) {
      console.error(`❌ Error processing hotel ${hotelId}:`, error);
    }
  }

  // Create a master file that includes all hotels
  if (generatedFiles.length > 0) {
    const masterStatements: string[] = [];
    masterStatements.push('-- Master migration SQL for all hotels');
    masterStatements.push(`-- Generated: ${new Date().toISOString()}`);
    masterStatements.push(`-- Total hotels: ${stats.totalHotels}`);
    masterStatements.push(`-- Total dates: ${stats.totalDates}\n`);
    masterStatements.push('BEGIN;\n');

    // Read and combine all individual hotel files
    for (const file of generatedFiles) {
      const content = await Deno.readTextFile(file);
      // Remove the BEGIN/COMMIT from individual files
      const sqlStatements = content
        .split('\n')
        .filter(line => !line.startsWith('--') && line.trim() !== 'BEGIN;' && line.trim() !== 'COMMIT;')
        .filter(line => line.trim().length > 0)
        .join('\n');

      masterStatements.push(sqlStatements);
      masterStatements.push(''); // blank line between hotels
    }

    masterStatements.push('\nCOMMIT;');

    const masterFile = './migrations/all_hotels.sql';
    await Deno.writeTextFile(masterFile, masterStatements.join('\n'));
    console.log(`💾 Wrote master file: ${masterFile}\n`);
  }

  // Print summary
  console.log('\n📊 Generation Summary:');
  console.log(`   Total hotels: ${stats.totalHotels}`);
  console.log(`   Total dates: ${stats.totalDates}`);
  console.log(`   ⏭️  Skipped: ${stats.skippedDates}`);
  console.log(`\n📁 Generated files:`);
  generatedFiles.forEach(file => console.log(`   - ${file}`));
  console.log(`   - ./migrations/all_hotels.sql (master file)`);
  console.log(`\n📋 Next steps:`);
  console.log(`   Option 1 (Recommended for small datasets):`);
  console.log(`     1. Open Supabase SQL Editor`);
  console.log(`     2. Copy contents of ./migrations/all_hotels.sql`);
  console.log(`     3. Run the query`);
  console.log(`\n   Option 2 (For large datasets - migrate one hotel at a time):`);
  console.log(`     1. Open Supabase SQL Editor`);
  console.log(`     2. Copy contents of ./migrations/hotel_XXXXX.sql`);
  console.log(`     3. Run the query`);
  console.log(`     4. Repeat for each hotel`);
  console.log(`\n🎉 SQL generation complete!`);
}

// Run generation
generateMigrationSQLPerHotel();
