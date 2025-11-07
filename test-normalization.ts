/**
 * Test script to demonstrate data normalization
 */

import { compactHotelData } from './data-compactor.ts';
import { normalizeHotelData } from './data-normalizer.ts';
import { writeFile } from './utils.ts';
import { readFile } from 'node:fs/promises';

async function testNormalization() {
  console.log('🗂️  Testing data normalization...\n');

  // Read the mock hotel data
  const mockData = JSON.parse(
    await readFile('./mocks/json/hotel-booking-info-success-response.json', 'utf-8')
  );

  // Compact the data first
  const compacted = compactHotelData(mockData);

  if (!compacted) {
    console.error('❌ Failed to compact data');
    return;
  }

  // Normalize the compacted data
  const checkInDate = '2025-10-10';
  const normalized = normalizeHotelData(compacted, checkInDate);

  console.log('✅ Data normalized successfully!\n');

  // Display structure
  console.log('📊 Normalized Data Structure:\n');

  console.log('1️⃣  Hotel Record:');
  console.log(`   - Hotel ID: ${normalized.hotel.hotel_id}`);
  console.log(`   - Name: ${normalized.hotel.name}`);
  console.log(`   - Location: ${normalized.hotel.city}, ${normalized.hotel.country}`);
  console.log(`   - Star Rating: ${normalized.hotel.star_rating}`);
  console.log(`   - Min Price: ${normalized.hotel.min_price} ${normalized.hotel.currency}`);
  console.log(`   - Max Price: ${normalized.hotel.max_price} ${normalized.hotel.currency}`);
  console.log(`   - Primary Image: ${normalized.hotel.primary_image_url?.substring(0, 50)}...`);

  console.log('\n2️⃣  Daily Rate Record:');
  console.log(`   - Hotel ID: ${normalized.dailyRate.hotel_id}`);
  console.log(`   - Check-in Date: ${normalized.dailyRate.check_in_date}`);
  console.log(`   - Min Rate: ${normalized.dailyRate.min_rate} ${normalized.dailyRate.currency}`);
  console.log(`   - Max Rate: ${normalized.dailyRate.max_rate} ${normalized.dailyRate.currency}`);
  console.log(`   - Room Types Count: ${normalized.dailyRate.room_types_count}`);

  console.log('\n3️⃣  Room Types:');
  normalized.roomTypes.forEach((room, idx) => {
    console.log(`   Room ${idx + 1}:`);
    console.log(`   - ID: ${room.room_id}`);
    console.log(`   - Name: ${room.name}`);
  });

  console.log('\n4️⃣  Room Rates:');
  const ratesByRoom = normalized.roomRates.reduce((acc, rate) => {
    if (!acc[rate.room_id]) acc[rate.room_id] = [];
    acc[rate.room_id].push(rate);
    return acc;
  }, {} as Record<string, typeof normalized.roomRates>);

  Object.entries(ratesByRoom).forEach(([roomId, rates]) => {
    console.log(`   Room ${roomId}:`);
    rates.forEach((rate, idx) => {
      console.log(`     Rate ${idx + 1}:`);
      console.log(`     - Final Price: ${rate.final_rate} ${rate.currency}`);
      console.log(`     - Board Basis: ${rate.board_basis}`);
      console.log(`     - Refundable: ${rate.is_refundable}`);
    });
  });

  console.log('\n5️⃣  Images:');
  const hotelImages = normalized.images.filter(img => !img.room_id);
  const roomImages = normalized.images.filter(img => img.room_id);
  console.log(`   - Hotel Images: ${hotelImages.length}`);
  console.log(`   - Room Images: ${roomImages.length}`);
  console.log(`   - Total Images: ${normalized.images.length}`);

  // Save the normalized example
  await writeFile('output/example/normalized-example.json', JSON.stringify(normalized, null, 2));

  console.log('\n✅ Normalized example saved to output/example/normalized-example.json');

  // Compare sizes
  const compactedJson = JSON.stringify(compacted);
  const normalizedJson = JSON.stringify(normalized);

  console.log('\n📦 Size Comparison:');
  console.log(`   - Compacted: ${(new Blob([compactedJson]).size / 1024).toFixed(2)} KB`);
  console.log(`   - Normalized: ${(new Blob([normalizedJson]).size / 1024).toFixed(2)} KB`);

  console.log('\n💡 Database Benefits:');
  console.log('   ✓ Static hotel data stored once (not repeated per date)');
  console.log('   ✓ Room types stored once per hotel (not per date)');
  console.log('   ✓ Only rates change per date (minimal storage)');
  console.log('   ✓ Efficient queries for listings (no JSON parsing)');
  console.log('   ✓ Fast filtering by city, price, star rating');
  console.log('   ✓ Automatic price aggregation via triggers');
}

testNormalization().catch(console.error);
