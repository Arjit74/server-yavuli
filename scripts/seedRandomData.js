const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to generate a random number between min and max (inclusive)
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Function to update listings with random view counts and favorites
const updateListingsWithRandomData = async () => {
  try {
    // First, get all listings
    const { data: listings, error: fetchError } = await supabase
      .from('listings')
      .select('id');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${listings.length} listings to update`);

    // Update each listing with random view count and favorites
    for (const listing of listings) {
      const views = getRandomInt(3, 100);
      const favoritesCount = getRandomInt(0, 30);

      // Update the listing with random view count
      const { error: updateError } = await supabase
        .from('listings')
        .update({ 
          views,
          favorites_count: favoritesCount 
        })
        .eq('id', listing.id);

      if (updateError) {
        console.error(`Error updating listing ${listing.id}:`, updateError);
        continue;
      }

      console.log(`Updated listing ${listing.id} with ${views} views and ${favoritesCount} favorites`);
      
      // Add some random favorites (if needed)
      if (favoritesCount > 0) {
        // Get some random users to favorite this listing
        const { data: users } = await supabase
          .from('profiles')
          .select('id')
          .order('random()')
          .limit(favoritesCount);

        if (users && users.length > 0) {
          const favorites = users.map(user => ({
            user_id: user.id,
            listing_id: listing.id,
            created_at: new Date().toISOString()
          }));

          // Insert the favorites
          const { error: favoriteError } = await supabase
            .from('favorites')
            .upsert(favorites, { onConflict: 'user_id,listing_id' });

          if (favoriteError) {
            console.error(`Error adding favorites for listing ${listing.id}:`, favoriteError);
          }
        }
      }
    }

    console.log('Successfully updated all listings with random data');
    process.exit(0);
  } catch (error) {
    console.error('Error in updateListingsWithRandomData:', error);
    process.exit(1);
  }
};

// Run the function
updateListingsWithRandomData();
