import { TravclanHotelScraper } from './travclan-scraper.ts';
import { sleep, writeFile } from './utils.ts';
import { hotels } from './mocks/hotels.ts';
import { saveHotelData } from './supabase-client.ts';


async function main() {
  // iterate through all days in october starting from today
  for (const { hotelId } of hotels) {

    const requests = [];
    
    for (let day = 10; day <= 30; day++) {
      const promise = new Promise<void>(async (resolve) => {
        const checkInDate = `2025-11-${day.toString().padStart(2, '0')}`;
        const checkOutDate = `2025-11-${(day + 1).toString().padStart(2, '0')}`;

        const scraper = new TravclanHotelScraper(hotelId.toString());

        console.log(`⚠️ Fetching booking info for ${checkInDate} for ${hotelId}`);

        const res = await scraper.fetchHotelBookingInfo(checkInDate, checkOutDate).catch(err => {
          console.error(`❌ Failed to fetch hotel booking info for hotelId ${hotelId} on ${checkInDate}:`, err);
          return err;
        });

        const fileName = `output/${hotelId}/${checkInDate}.json`;
        await writeFile(fileName, JSON.stringify(res, null, 2));

        // Also save to Supabase
        await saveHotelData(hotelId.toString(), checkInDate, res);

        console.log(`✅ Saved hotel booking info for ${checkInDate} for ${hotelId}`);

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