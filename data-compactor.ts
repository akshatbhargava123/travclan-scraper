/**
 * Compacts hotel data to only include essential fields
 * This reduces storage and I/O overhead significantly
 */

export interface CompactRate {
  id: string;
  baseRate: number;
  finalRate: number;
  currency: string;
  refundable: boolean;
  boardBasis?: string;
}

export interface CompactRoomType {
  id: string;
  name: string;
  rates: CompactRate[];
  images?: string[];
}

export interface CompactHotelData {
  hotelId: string;
  name: string;
  starRating?: string;
  chainName?: string;
  location: {
    address?: string;
    city?: string;
    country?: string;
    geoCode?: {
      lat: string;
      long: string;
    };
  };
  photos: string[];
  roomTypes: CompactRoomType[];
}

/**
 * Compacts the full hotel response to essential fields only
 * @param data - Full hotel booking response (can be wrapped in results or direct hotel object)
 * @returns Compacted hotel data
 */
export function compactHotelData(data: any): CompactHotelData | null {
  if (!data) {
    return null;
  }

  // Handle both response formats:
  // 1. Wrapped format: { results: [{ data: [hotelData] }] }
  // 2. Direct format: hotelData directly
  let hotelData: any;

  if (data.results && Array.isArray(data.results) && data.results.length > 0) {
    // Wrapped format
    const result = data.results[0];
    hotelData = result.data?.[0];
  } else if (data.id && data.name) {
    // Direct format - data is already the hotel object
    hotelData = data;
  }

  if (!hotelData) {
    return null;
  }

  // Extract basic hotel info
  const compacted: CompactHotelData = {
    hotelId: hotelData.id,
    name: hotelData.name || '',
    starRating: hotelData.starRating,
    chainName: hotelData.chainName,
    location: {
      address: hotelData.contact?.address?.line1,
      city: hotelData.contact?.address?.city?.name,
      country: hotelData.contact?.address?.country?.name,
      geoCode: hotelData.geoCode ? {
        lat: hotelData.geoCode.lat,
        long: hotelData.geoCode.long,
      } : undefined,
    },
    photos: [],
    roomTypes: [],
  };

  // Extract photo URLs (up to 10 photos)
  if (hotelData.images && Array.isArray(hotelData.images)) {
    compacted.photos = hotelData.images
      .slice(0, 10)
      .map((img: any) => {
        // Get the standard size URL if available
        const link = img.links?.find((l: any) => l.size === 'Standard') || img.links?.[0];
        return link?.url;
      })
      .filter(Boolean);
  }

  // Extract room types (max 5) with rates (max 2 per room)
  // The data structure is roomRate[0].standardizedRooms and roomRate[0].rates
  const roomRateData = hotelData.roomRate?.[0];

  if (roomRateData?.standardizedRooms) {
    const roomIds = Object.keys(roomRateData.standardizedRooms).slice(0, 5);

    for (const roomId of roomIds) {
      const room = roomRateData.standardizedRooms[roomId];
      const compactRoom: CompactRoomType = {
        id: room.id,
        name: room.name,
        rates: [],
        images: [],
      };

      // Extract room images (up to 3 per room)
      if (room.images && Array.isArray(room.images)) {
        compactRoom.images = room.images
          .slice(0, 3)
          .map((img: any) => {
            const link = img.links?.find((l: any) => l.size === 'Standard') || img.links?.[0];
            return link?.url;
          })
          .filter(Boolean);
      }

      // Find rates for this room (max 2 rates per room)
      if (roomRateData.rates) {
        const rateIds = Object.keys(roomRateData.rates);
        let ratesAdded = 0;

        for (const rateId of rateIds) {
          if (ratesAdded >= 2) break;

          const rate = roomRateData.rates[rateId];

          // Check if this rate applies to the current room
          const appliesToRoom = rate.occupancies?.some(
            (occ: any) => occ.stdRoomId === roomId
          );

          if (appliesToRoom) {
            compactRoom.rates.push({
              id: rate.id,
              baseRate: rate.baseRate,
              finalRate: rate.finalRate,
              currency: rate.currency,
              refundable: rate.refundable || false,
              boardBasis: rate.boardBasis?.type || rate.boardBasis?.description,
            });
            ratesAdded++;
          }
        }
      }

      // Only add room if it has at least one rate
      if (compactRoom.rates.length > 0) {
        compacted.roomTypes.push(compactRoom);
      }
    }
  }

  return compacted;
}
