import { TravclanHotelScraper } from './travclan-scraper.ts';
import { sleep, writeFile } from './utils.ts';
import { hotels } from './mocks/hotels.ts';
// import { saveHotelData } from './supabase-client.ts'; // Legacy - not needed for normalized tables
import { compactHotelData } from './data-compactor.ts';
import { normalizeHotelData } from './data-normalizer.ts';
import { saveNormalizedHotelData } from './supabase-normalized.ts';


async function main() {
  // Get tomorrow's date (current + 1 day)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const { hotelId } of hotels) {

    const requests = [];

    // Scrape from tomorrow to next 30 days
    for (let dayOffset = 10; dayOffset <= 60; dayOffset++) {
      const promise = new Promise<void>(async (resolve) => {
        const checkInDateObj = new Date(tomorrow);
        checkInDateObj.setDate(tomorrow.getDate() + dayOffset);

        const checkOutDateObj = new Date(checkInDateObj);
        checkOutDateObj.setDate(checkInDateObj.getDate() + 1);

        // Format dates as YYYY-MM-DD
        const checkInDate = checkInDateObj.toISOString().split('T')[0];
        const checkOutDate = checkOutDateObj.toISOString().split('T')[0];

        const scraper = new TravclanHotelScraper(hotelId.toString());

        console.log(`⚠️ Fetching booking info for ${checkInDate} for ${hotelId}`);

        const res = await scraper.fetchHotelBookingInfo(checkInDate, checkOutDate).catch(err => {
          console.error(`❌ Failed to fetch hotel booking info for hotelId ${hotelId} on ${checkInDate}:`, err?.toString());
          return err;
        });

        // writeFile('mocks/json/hotel-booking-info-success-response.json', JSON.stringify(res, null, 2));

        // Compact the data before saving
        const compactedData = compactHotelData(res);

        if (compactedData) {
          const fileName = `output/${hotelId}/${checkInDate}.json`;
          await writeFile(fileName, JSON.stringify(compactedData, null, 2));

          // Normalize the compacted data for database storage
          const normalizedData = normalizeHotelData(compactedData, checkInDate);

          // Save to normalized Supabase tables
          await saveNormalizedHotelData(hotelId.toString(), checkInDate, normalizedData);

          // Legacy table save disabled - using normalized tables only
          // Uncomment below if you need backward compatibility with old hotels table
          // await saveHotelData(hotelId.toString(), checkInDate, res);

          console.log(`✅ Saved hotel booking info for ${checkInDate} for ${hotelId}`);
        } else {
          console.log(`⏭️ Skipped saving for ${checkInDate} for ${hotelId} - no valid data`);
        }

        resolve();
      });

      requests.push(promise);
    }

    await Promise.all(requests);
    console.log(`🏁 Completed fetching data for hotelId ${hotelId}\n`);

    await sleep(2000); // sleep for 2 seconds between hotels to avoid rate limiting
  }
}

main();