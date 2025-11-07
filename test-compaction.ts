/**
 * Test script to demonstrate data compaction
 */

import { compactHotelData } from './data-compactor.ts';
import { writeFile } from './utils.ts';
import { readFile } from 'node:fs/promises';

async function testCompaction() {
  console.log('📦 Testing data compaction...\n');

  // Read the mock hotel data
  const mockData = JSON.parse(
    await readFile('./mocks/json/hotel-booking-info-success-response.json', 'utf-8')
  );

  // Get original size
  const originalJson = JSON.stringify(mockData);
  const originalSize = new Blob([originalJson]).size;

  console.log(`Original data size: ${(originalSize / 1024).toFixed(2)} KB`);
  console.log(`Original fields: ${Object.keys(mockData).length} top-level fields`);

  // Compact the data
  const compacted = compactHotelData(mockData);

  if (!compacted) {
    console.error('❌ Failed to compact data');
    return;
  }

  // Get compacted size
  const compactedJson = JSON.stringify(compacted);
  const compactedSize = new Blob([compactedJson]).size;

  console.log(`\nCompacted data size: ${(compactedSize / 1024).toFixed(2)} KB`);
  console.log(`Compacted fields: ${Object.keys(compacted).length} top-level fields`);
  console.log(`\nSize reduction: ${((1 - compactedSize / originalSize) * 100).toFixed(2)}%`);
  console.log(`Space saved: ${((originalSize - compactedSize) / 1024).toFixed(2)} KB`);

  // Save the compacted example
  await writeFile('output/example/compacted-example.json', JSON.stringify(compacted, null, 2));

  console.log('\n✅ Compacted example saved to output/example/compacted-example.json');
  console.log('\nCompacted structure:');
  console.log(`- Hotel ID: ${compacted.hotelId}`);
  console.log(`- Name: ${compacted.name}`);
  console.log(`- Star Rating: ${compacted.starRating}`);
  console.log(`- Photos: ${compacted.photos.length} URLs`);
  console.log(`- Room Types: ${compacted.roomTypes.length} (max 5)`);

  compacted.roomTypes.forEach((room, idx) => {
    console.log(`  - Room ${idx + 1}: ${room.name}`);
    console.log(`    - Rates: ${room.rates.length} (max 2 per room)`);
    console.log(`    - Images: ${room.images?.length || 0}`);
  });
}

testCompaction().catch(console.error);
