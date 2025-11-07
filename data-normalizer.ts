/**
 * Normalizes compacted hotel data into separate records for different database tables
 */

import type { CompactHotelData } from './data-compactor.ts';

export interface NormalizedHotelData {
  hotel: HotelRecord;
  dailyRate: DailyRateRecord;
  roomTypes: RoomTypeRecord[];
  roomRates: RoomRateRecord[];
  images: ImageRecord[];
}

export interface HotelRecord {
  hotel_id: string;
  name: string;
  provider_id?: string;
  provider_hotel_id?: string;
  provider_name?: string;

  // Location
  address_line1?: string;
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  postal_code?: string;
  latitude?: string;
  longitude?: string;

  // Hotel attributes
  chain_name?: string;
  chain_code?: string;
  star_rating?: string;
  category?: string;
  hotel_type?: string;

  // Pricing aggregates (computed from daily rates)
  min_price?: number;
  max_price?: number;
  currency?: string;

  // Primary image
  primary_image_url?: string;

  // Contact
  phone?: string;
  fax?: string;
}

export interface DailyRateRecord {
  hotel_id: string;
  check_in_date: string;
  min_rate?: number;
  max_rate?: number;
  currency?: string;
  room_types_count?: number;
}

export interface RoomTypeRecord {
  hotel_id: string;
  room_id: string;
  name: string;
  description?: string;
}

export interface RoomRateRecord {
  hotel_id: string;
  room_id: string;
  check_in_date: string;
  rate_id: string;
  base_rate: number;
  final_rate: number;
  currency: string;
  board_basis?: string;
  is_refundable: boolean;
}

export interface ImageRecord {
  hotel_id: string;
  room_id?: string;
  image_url: string;
  image_order: number;
}

/**
 * Normalizes compacted hotel data into separate database records
 */
export function normalizeHotelData(
  compactData: CompactHotelData,
  checkInDate: string
): NormalizedHotelData {
  // Extract hotel record
  const hotel: HotelRecord = {
    hotel_id: compactData.hotelId,
    name: compactData.name,
    star_rating: compactData.starRating,
    chain_name: compactData.chainName,

    // Location
    address_line1: compactData.location.address,
    city: compactData.location.city,
    country: compactData.location.country,
    latitude: compactData.location.geoCode?.lat,
    longitude: compactData.location.geoCode?.long,

    // Primary image (first photo)
    primary_image_url: compactData.photos[0] || null,
  };

  // Calculate min/max rates for this date
  let minRate: number | undefined;
  let maxRate: number | undefined;
  let currency = 'INR';

  compactData.roomTypes.forEach((room) => {
    room.rates.forEach((rate) => {
      if (!minRate || rate.finalRate < minRate) {
        minRate = rate.finalRate;
      }
      if (!maxRate || rate.finalRate > maxRate) {
        maxRate = rate.finalRate;
      }
      currency = rate.currency;
    });
  });

  // Extract daily rate record
  const dailyRate: DailyRateRecord = {
    hotel_id: compactData.hotelId,
    check_in_date: checkInDate,
    min_rate: minRate,
    max_rate: maxRate,
    currency,
    room_types_count: compactData.roomTypes.length,
  };

  // Update hotel currency and prices
  hotel.currency = currency;
  hotel.min_price = minRate;
  hotel.max_price = maxRate;

  // Extract room types
  const roomTypes: RoomTypeRecord[] = compactData.roomTypes.map((room) => ({
    hotel_id: compactData.hotelId,
    room_id: room.id,
    name: room.name,
  }));

  // Extract room rates
  const roomRates: RoomRateRecord[] = [];
  compactData.roomTypes.forEach((room) => {
    room.rates.forEach((rate) => {
      roomRates.push({
        hotel_id: compactData.hotelId,
        room_id: room.id,
        check_in_date: checkInDate,
        rate_id: rate.id,
        base_rate: rate.baseRate,
        final_rate: rate.finalRate,
        currency: rate.currency,
        board_basis: rate.boardBasis,
        is_refundable: rate.refundable,
      });
    });
  });

  // Extract images
  const images: ImageRecord[] = [];

  // Hotel images
  compactData.photos.forEach((url, index) => {
    images.push({
      hotel_id: compactData.hotelId,
      image_url: url,
      image_order: index,
    });
  });

  // Room images
  compactData.roomTypes.forEach((room) => {
    if (room.images) {
      room.images.forEach((url, index) => {
        images.push({
          hotel_id: compactData.hotelId,
          room_id: room.id,
          image_url: url,
          image_order: index,
        });
      });
    }
  });

  return {
    hotel,
    dailyRate,
    roomTypes,
    roomRates,
    images,
  };
}
