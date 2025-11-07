/**
 * Backfill chain names for existing hotels in the database
 * This script fetches fresh data for each hotel and updates the chain_name field
 */

import { TravclanHotelScraper } from './travclan-scraper.ts';
import { supabase } from './supabase-client.ts';

async function backfillChainNames() {
  console.log('🔄 Starting chain name backfill...\n');

  // Get all hotels from database that don't have chain_name
  const { data: hotels, error } = await supabase
    .from('hotels')
    .select('hotel_id, name, chain_name')
    .is('chain_name', null);

  if (error) {
    console.error('❌ Error fetching hotels:', error);
    return;
  }

  if (!hotels || hotels.length === 0) {
    console.log('✅ All hotels already have chain names!');
    return;
  }

  console.log(`Found ${hotels.length} hotels without chain names\n`);

  let updated = 0;
  let noChainName = 0;
  let failed = 0;

  for (const hotel of hotels) {
    try {
      console.log(`🔍 Fetching data for ${hotel.hotel_id} (${hotel.name})...`);

      // Fetch fresh data for tomorrow (just one date to get the hotel info)
      const scraper = new TravclanHotelScraper(hotel.hotel_id);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const checkIn = tomorrow.toISOString().split('T')[0];
      const checkOut = new Date(tomorrow.getTime() + 86400000).toISOString().split('T')[0];

      const data = await scraper.fetchHotelBookingInfo(checkIn, checkOut);

      // Extract chain name from the response
      const chainName = data?.chainName || null;

      if (chainName) {
        // Update database
        const { error: updateError } = await supabase
          .from('hotels')
          .update({ chain_name: chainName })
          .eq('hotel_id', hotel.hotel_id);

        if (updateError) {
          console.error(`❌ Failed to update ${hotel.hotel_id}:`, updateError.message);
          failed++;
        } else {
          console.log(`✅ Updated ${hotel.hotel_id}: "${chainName}"\n`);
          updated++;
        }
      } else {
        console.log(`⚠️  No chain name in API response for ${hotel.hotel_id}\n`);
        noChainName++;
      }

      // Rate limiting - wait 1.5 seconds between requests to avoid hitting API limits
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.error(`❌ Error processing ${hotel.hotel_id}:`, error);
      failed++;

      // If we hit rate limits, wait longer
      if (error.toString().includes('429') || error.toString().includes('Too Many')) {
        console.log('⏸️  Rate limited - waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  No chain name: ${noChainName}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total processed: ${hotels.length}`);

  if (updated > 0) {
    console.log('\n🎉 Chain names have been backfilled!');
    console.log('💡 Refresh your frontend to see the updated brand filters.');
  }
}

backfillChainNames();
