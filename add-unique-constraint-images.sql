-- Add unique constraint to hotel_images to prevent duplicates
-- Run this after cleaning up existing duplicates

-- First, check if the constraint already exists
-- If it does, this will fail harmlessly
DO $$
BEGIN
    -- Add unique constraint on (hotel_id, room_type_id, image_url)
    -- This ensures each unique image URL is stored only once per hotel/room combination
    ALTER TABLE hotel_images
    ADD CONSTRAINT hotel_images_unique_key
    UNIQUE (hotel_id, room_type_id, image_url);

    RAISE NOTICE 'Unique constraint added successfully';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Constraint already exists, skipping';
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists, skipping';
END $$;

-- Also create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_hotel_images_hotel_room
ON hotel_images(hotel_id, room_type_id);

-- Create index for hotel images only (room_type_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_hotel_images_hotel_only
ON hotel_images(hotel_id)
WHERE room_type_id IS NULL;
