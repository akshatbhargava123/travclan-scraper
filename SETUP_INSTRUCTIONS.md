# Setup Instructions for Normalized Database

## Error Fixed

The error you encountered:
```
Could not find the 'check_in_date' column of 'hotels' in the schema cache
```

This happened because:
1. The scraper was trying to save to a legacy `hotels` table that doesn't exist
2. You need to run the database migration to create the normalized tables

## Solution Applied

✅ **Disabled legacy table save** in `main.ts` (line 60)
- Now only saves to normalized tables
- Legacy save is commented out

## Required: Run Database Migration

Before running the scraper, you **must** create the normalized database tables.

### Step 1: Connect to Your Supabase Database

Get your database connection URL from Supabase dashboard:
1. Go to Supabase Dashboard → Project Settings → Database
2. Copy the "Connection string" (URI format)

### Step 2: Run the Migration

**Option A: Using psql (Command Line)**

```bash
# Replace with your actual Supabase connection string
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration
psql $DATABASE_URL -f migrations/001_normalized_schema.sql
```

**Option B: Using Supabase SQL Editor**

1. Go to Supabase Dashboard → SQL Editor
2. Click "New query"
3. Copy the entire contents of `migrations/001_normalized_schema.sql`
4. Paste into the editor
5. Click "Run"

**Option C: Using Supabase CLI**

```bash
# If you have Supabase CLI installed
supabase db push --db-url "your-database-url"
```

### Step 3: Verify Tables Were Created

Run this query in Supabase SQL Editor to verify:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('hotels', 'hotel_daily_rates', 'room_types', 'room_rates', 'hotel_images')
ORDER BY table_name;
```

You should see all 5 tables listed.

### Step 4: Run the Scraper

```bash
deno run --allow-all main.ts
```

## What Gets Created

The migration creates:

### Tables
1. **hotels** - Static hotel information (name, location, star rating)
2. **hotel_daily_rates** - Pricing per check-in date
3. **room_types** - Room definitions per hotel
4. **room_rates** - Detailed rates per room per date
5. **hotel_images** - Hotel and room photos

### Indexes
- Fast lookups by hotel_id, city, price, star rating
- Efficient date range queries
- Room and rate joins

### Triggers
- Auto-update price aggregates when rates change
- Auto-update timestamps on record changes

### Views
- `hotel_listing_view` - Optimized for listing page
- `hotel_detail_with_rates` - Optimized for detail page

## Troubleshooting

### Error: "relation 'hotels' does not exist"
→ You haven't run the migration yet. Follow Step 2 above.

### Error: "permission denied for table hotels"
→ Make sure you're using the SERVICE_KEY, not ANON_KEY
→ Check your `.env` file has `SUPABASE_SERVICE_KEY`

### Error: "column 'check_in_date' does not exist in hotels"
→ You have an old hotels table structure
→ Option 1: Drop the old table and run migration
→ Option 2: Keep both (uncomment legacy save in main.ts)

```sql
-- To drop old table (BE CAREFUL - deletes all data!)
DROP TABLE IF EXISTS hotels CASCADE;

-- Then run the migration
```

### Error: "duplicate key value violates unique constraint"
→ You're trying to insert the same hotel+date twice
→ This is normal - the upsert will update existing records

## Data Flow After Setup

```
1. Scraper fetches hotel data from API (2561 KB)
   ↓
2. Compacts to essential fields (3.72 KB) - 99.85% reduction
   ↓
3. Normalizes into 5 separate table records
   ↓
4. Saves to Supabase normalized tables
   ↓
5. Triggers auto-update price aggregates
   ↓
6. Frontend queries fast indexed tables
```

## Test Your Setup

After running the migration, test with this query:

```sql
-- Should return empty (no data yet)
SELECT hotel_id, name, city, min_price
FROM hotels
LIMIT 5;
```

Then run the scraper and check again:

```sql
-- Should show hotels with data
SELECT
  h.hotel_id,
  h.name,
  h.city,
  h.min_price,
  COUNT(hdr.check_in_date) as dates_scraped
FROM hotels h
LEFT JOIN hotel_daily_rates hdr ON h.hotel_id = hdr.hotel_id
GROUP BY h.hotel_id, h.name, h.city, h.min_price;
```

## Need Help?

1. Check `DATABASE_SCHEMA.md` for detailed schema documentation
2. Check `NORMALIZATION_SUMMARY.md` for implementation details
3. Run `test-normalization.ts` to verify data structure locally

## Summary

✅ **Fixed:** Commented out legacy table save in main.ts
⚠️ **Action Required:** Run database migration (Step 2 above)
✅ **Ready:** Scraper will save to normalized tables only
