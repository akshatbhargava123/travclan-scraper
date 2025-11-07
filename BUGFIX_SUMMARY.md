# Bug Fix: Data Compactor Response Format

## Issue

The `compactHotelData()` function was returning `null` because it was expecting a wrapped response format:

```typescript
// Expected format (old mock):
{
  results: [{
    data: [hotelData]
  }]
}
```

But the actual API response has a **direct format**:

```typescript
// Actual API format:
{
  id: "39518957",
  name: "ITC Grand Chola...",
  roomRate: [...],
  images: [...],
  // ... other hotel fields directly
}
```

## Root Cause

The compactor was looking for `data.results[0].data[0]` but the API returns the hotel object directly at the root level.

## Fix

Updated `data-compactor.ts` to handle **both formats**:

```typescript
export function compactHotelData(data: any): CompactHotelData | null {
  if (!data) {
    return null;
  }

  // Handle both response formats:
  // 1. Wrapped format: { results: [{ data: [hotelData] }] }
  // 2. Direct format: hotelData directly
  let hotelData: any;

  if (data.results && Array.isArray(data.results) && data.results.length > 0) {
    // Wrapped format (old mock)
    const result = data.results[0];
    hotelData = result.data?.[0];
  } else if (data.id && data.name) {
    // Direct format (actual API) - data is already the hotel object
    hotelData = data;
  }

  if (!hotelData) {
    return null;
  }

  // ... rest of compaction logic
}
```

## Validation

### Before Fix
```
compactedData = null
```

### After Fix
```bash
$ deno eval "import { compactHotelData } from './data-compactor.ts'; ..."

✓ Compacted: SUCCESS
✓ Hotel ID: 39518957
✓ Name: ITC Grand Chola, a Luxury Collection Hotel, Chennai
✓ City: Chennai
✓ Photos: 10
✓ Room Types: 5
```

### Test Results

**Compaction Test:**
```
Original data size: 2561.23 KB
Compacted data size: 3.72 KB
Size reduction: 99.85%
Space saved: 2557.51 KB

✓ 5 room types extracted
✓ 2 rates per room type
✓ 10 hotel photos
✓ 9 room images
```

**Normalization Test:**
```
✓ 1 Hotel Record
✓ 1 Daily Rate Record
✓ 5 Room Types
✓ 10 Room Rates (2 per room)
✓ 19 Images (10 hotel + 9 room)
```

## Files Changed

1. **`data-compactor.ts`** (lines 44-65)
   - Added logic to detect and handle both response formats
   - Checks for wrapped format first, then direct format
   - Updated JSDoc comment

2. **`test-compaction.ts`** (line 22)
   - Fixed field count calculation for direct format

## Impact

- ✅ Scraper now correctly processes real API responses
- ✅ Backward compatible with old mock format
- ✅ Compaction working: 99.85% size reduction
- ✅ Normalization working: proper database records
- ✅ All tests passing

## Example Output

**Compacted Data Structure:**
```json
{
  "hotelId": "39518957",
  "name": "ITC Grand Chola, a Luxury Collection Hotel, Chennai",
  "starRating": "5",
  "location": {
    "address": "# 63 Mount Road, Chennai",
    "city": "Chennai",
    "country": "India",
    "geoCode": {
      "lat": "13.01181",
      "long": "80.21999"
    }
  },
  "photos": [10 URLs...],
  "roomTypes": [
    {
      "id": "1",
      "name": "House Run Of",
      "rates": [2 rates...],
      "images": []
    }
    // ... 4 more room types
  ]
}
```

## Testing

Run these commands to verify the fix:

```bash
# Test compaction
deno run --allow-read --allow-write test-compaction.ts

# Test normalization
deno run --allow-read --allow-write test-normalization.ts

# Run main scraper (with limited date range for testing)
deno run --allow-all main.ts
```

All tests should pass and show successful data compaction and normalization.
