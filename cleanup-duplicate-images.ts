/**
 * Cleanup duplicate images in hotel_images table
 * Keeps only one instance of each unique (hotel_id, room_type_id, image_url) combination
 */

import { supabase } from './supabase-client.ts';

async function cleanupDuplicateImages() {
  console.log('🧹 Starting duplicate image cleanup...\n');

  try {
    // Fetch all images
    const { data: allImages, error: fetchError } = await supabase
      .from('hotel_images')
      .select('*')
      .order('hotel_id')
      .order('image_order');

    if (fetchError) {
      console.error('❌ Error fetching images:', fetchError);
      return;
    }

    if (!allImages || allImages.length === 0) {
      console.log('No images found in database');
      return;
    }

    console.log(`Found ${allImages.length} total images\n`);

    // Group by unique key
    const uniqueImages = new Map<string, any>();
    const duplicateIds: number[] = [];

    for (const image of allImages) {
      const key = `${image.hotel_id}|${image.room_type_id}|${image.image_url}`;

      if (uniqueImages.has(key)) {
        // This is a duplicate - mark for deletion
        duplicateIds.push(image.id);
      } else {
        // First occurrence - keep it
        uniqueImages.set(key, image);
      }
    }

    console.log(`Found ${duplicateIds.length} duplicate images to remove`);
    console.log(`Keeping ${uniqueImages.size} unique images\n`);

    if (duplicateIds.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    // Delete duplicates in batches of 1000 (Supabase limit)
    const batchSize = 1000;
    let deleted = 0;

    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = duplicateIds.slice(i, i + batchSize);

      const { error: deleteError } = await supabase
        .from('hotel_images')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError.message);
      } else {
        deleted += batch.length;
        console.log(`✅ Deleted batch ${i / batchSize + 1}: ${batch.length} images (${deleted}/${duplicateIds.length} total)`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   🗑️  Deleted: ${deleted} duplicate images`);
    console.log(`   ✅ Remaining: ${uniqueImages.size} unique images`);
    console.log(`   📉 Reduction: ${((deleted / allImages.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

cleanupDuplicateImages();
