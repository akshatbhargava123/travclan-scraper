import { createClient } from '@supabase/supabase-js';
import { compactHotelData } from './data-compactor.ts';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveHotelData(hotelId: string, checkInDate: string, data: any) {
  try {
    // Skip empty data
    if (!data || Object.keys(data).length === 0) {
      console.log(`⏭️  Skipping empty data for hotel ${hotelId} on ${checkInDate}`);
      return { success: false, skipped: true };
    }

    // Compact the data to only essential fields
    const compactedData = compactHotelData(data);

    if (!compactedData) {
      console.log(`⏭️  Skipping invalid data for hotel ${hotelId} on ${checkInDate}`);
      return { success: false, skipped: true };
    }

    const { error } = await supabase
      .from('hotels')
      .upsert({
        hotel_id: hotelId,
        check_in_date: checkInDate,
        data: compactedData,
      }, {
        onConflict: 'hotel_id,check_in_date'
      });

    if (error) {
      console.error(`❌ Failed to save to Supabase for hotel ${hotelId} on ${checkInDate}:`, error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Error saving to Supabase for hotel ${hotelId} on ${checkInDate}:`, error);
    return { success: false, error };
  }
}
