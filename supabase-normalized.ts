import { createClient } from '@supabase/supabase-js';
import type { NormalizedHotelData } from './data-normalizer.ts';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Saves normalized hotel data to multiple tables
 */
export async function saveNormalizedHotelData(
  hotelId: string,
  checkInDate: string,
  normalizedData: NormalizedHotelData
) {
  try {
    // 1. Upsert hotel record (static data)
    const { error: hotelError } = await supabase
      .from('hotels')
      .upsert(normalizedData.hotel, {
        onConflict: 'hotel_id',
        ignoreDuplicates: false, // Update if exists
      });

    if (hotelError) {
      console.error(`❌ Failed to save hotel record for ${hotelId}:`, hotelError.message);
      return { success: false, error: hotelError };
    }

    // 2. Upsert daily rate record
    const { error: dailyRateError } = await supabase
      .from('hotel_daily_rates')
      .upsert(normalizedData.dailyRate, {
        onConflict: 'hotel_id,check_in_date',
        ignoreDuplicates: false,
      });

    if (dailyRateError) {
      console.error(`❌ Failed to save daily rate for ${hotelId} on ${checkInDate}:`, dailyRateError.message);
      return { success: false, error: dailyRateError };
    }

    // 3. Upsert room types (only insert new ones, skip existing)
    if (normalizedData.roomTypes.length > 0) {
      const { error: roomTypesError } = await supabase
        .from('room_types')
        .upsert(normalizedData.roomTypes, {
          onConflict: 'hotel_id,room_id',
          ignoreDuplicates: true, // Skip if already exists
        });

      if (roomTypesError) {
        console.error(`❌ Failed to save room types for ${hotelId}:`, roomTypesError.message);
        return { success: false, error: roomTypesError };
      }
    }

    // 4. Delete old room rates for this hotel+date, then insert new ones
    // This ensures we don't have stale rates
    const { error: deleteRatesError } = await supabase
      .from('room_rates')
      .delete()
      .eq('hotel_id', hotelId)
      .eq('check_in_date', checkInDate);

    if (deleteRatesError) {
      console.error(`❌ Failed to delete old room rates for ${hotelId} on ${checkInDate}:`, deleteRatesError.message);
      // Continue anyway
    }

    if (normalizedData.roomRates.length > 0) {
      // Need to fetch room_type_id for each rate
      const roomRatesWithTypeIds = [];

      for (const rate of normalizedData.roomRates) {
        // Get room_type_id from room_types table
        const { data: roomType, error: roomTypeError } = await supabase
          .from('room_types')
          .select('id')
          .eq('hotel_id', rate.hotel_id)
          .eq('room_id', rate.room_id)
          .single();

        if (roomTypeError || !roomType) {
          console.error(`❌ Failed to find room type for ${rate.room_id}:`, roomTypeError?.message);
          continue;
        }

        roomRatesWithTypeIds.push({
          hotel_id: rate.hotel_id,
          room_type_id: roomType.id,
          check_in_date: rate.check_in_date,
          rate_id: rate.rate_id,
          base_rate: rate.base_rate,
          final_rate: rate.final_rate,
          currency: rate.currency,
          board_basis: rate.board_basis,
          is_refundable: rate.is_refundable,
        });
      }

      if (roomRatesWithTypeIds.length > 0) {
        const { error: roomRatesError } = await supabase
          .from('room_rates')
          .insert(roomRatesWithTypeIds);

        if (roomRatesError) {
          console.error(`❌ Failed to save room rates for ${hotelId}:`, roomRatesError.message);
          return { success: false, error: roomRatesError };
        }
      }
    }

    // 5. Upsert images (skip duplicates)
    // Only insert images if they don't already exist to avoid duplicates
    if (normalizedData.images.length > 0) {
      // Check which images already exist
      const { data: existingImages } = await supabase
        .from('hotel_images')
        .select('hotel_id, room_type_id, image_url')
        .eq('hotel_id', hotelId);

      const existingImageSet = new Set(
        (existingImages || []).map(img =>
          `${img.hotel_id}|${img.room_type_id}|${img.image_url}`
        )
      );

      // Need to get room_type_id for room images
      const imagesWithTypeIds = [];

      for (const image of normalizedData.images) {
        let roomTypeId = null;

        if (image.room_id) {
          // Room image - need to fetch room_type_id
          const { data: roomType, error: roomTypeError } = await supabase
            .from('room_types')
            .select('id')
            .eq('hotel_id', image.hotel_id)
            .eq('room_id', image.room_id)
            .single();

          if (roomTypeError || !roomType) {
            console.error(`❌ Failed to find room type for image ${image.room_id}:`, roomTypeError?.message);
            continue;
          }

          roomTypeId = roomType.id;
        }

        // Check if this image already exists
        const imageKey = `${image.hotel_id}|${roomTypeId}|${image.image_url}`;
        if (existingImageSet.has(imageKey)) {
          // Skip - already exists
          continue;
        }

        imagesWithTypeIds.push({
          hotel_id: image.hotel_id,
          room_type_id: roomTypeId,
          image_url: image.image_url,
          image_order: image.image_order,
        });
      }

      if (imagesWithTypeIds.length > 0) {
        const { error: imagesError } = await supabase
          .from('hotel_images')
          .insert(imagesWithTypeIds);

        if (imagesError) {
          console.error(`❌ Failed to save images for ${hotelId}:`, imagesError.message);
          // Continue anyway - images are not critical
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`❌ Error saving normalized data for hotel ${hotelId} on ${checkInDate}:`, error);
    return { success: false, error };
  }
}
