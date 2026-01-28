const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authmiddleware');

// Valid condition values
const VALID_CONDITIONS = ['new', 'like-new', 'used'];

// Function to normalize and validate condition
const normalizeCondition = (condition) => {
  if (!condition) return null;
  const normalized = condition.toLowerCase().replace(/\s+/g, '-');
  return VALID_CONDITIONS.includes(normalized) ? normalized : null;
};

// POST - Create a new listing
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    console.log('POST /listings - User ID:', userId);
    console.log('Request body keys:', Object.keys(req.body));

    const { title, description, category, condition, price, originalPrice, city, college, reason, age, status = 'published', images = [] } = req.body;

    // Validation
    if (!title || !price || !description || !category || !condition) {
      console.log('Validation failed - Missing required fields:', { title, price, description, category, condition });
      return res.status(400).json({
        success: false,
        error: "Missing required fields: title, price, description, category, condition"
      });
    }

    // Normalize and validate condition
    const normalizedCondition = normalizeCondition(condition);
    if (!normalizedCondition) {
      return res.status(400).json({
        success: false,
        error: `Invalid condition. Allowed values are: ${VALID_CONDITIONS.join(', ')}`
      });
    }

    // Ensure user exists in users table (create if not exists)
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingUser && fetchError?.code === 'PGRST116') {
        // User doesn't exist, create them
        console.log('Creating user record for:', userId);
        const { error: createError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            email: userEmail,
            full_name: userEmail?.split('@')[0] || 'User',
            location: city || null
          }]);

        if (createError) {
          console.error('Error creating user record:', createError);
          // Continue anyway, the insert below might still work
        } else {
          console.log('User record created successfully');
        }
      }
    } catch (userCreateError) {
      console.error('Warning: Could not ensure user exists:', userCreateError);
      // Continue with listing creation
    }

    // Parse images if it's a string (from FormData)
    let imageArray = [];
    if (typeof images === 'string') {
      try {
        imageArray = JSON.parse(images);
      } catch (e) {
        imageArray = images ? [images] : [];
      }
    } else if (Array.isArray(images)) {
      imageArray = images;
    }

    // Convert status from client format to database format
    let dbStatus = 'active'; // default
    if (status === 'draft') {
      dbStatus = 'draft';
    } else if (status === 'published') {
      dbStatus = 'active';
    }

    console.log('Creating listing with:', { userId, title, price, category, condition, city, status, dbStatus, imageCount: imageArray.length });

    // Validate userId
    if (!userId) {
      console.log('Error: No user ID extracted from token');
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    console.log('About to insert listing into DB with values:', {
      user_id: userId,
      title,
      description,
      category,
      condition,
      price: parseFloat(price),
      location: city,
      status: dbStatus
    });

    // Create the listing
    const { data: listing, error } = await supabase
      .from('listings')
      .insert([{
        user_id: userId,
        title,
        description,
        category,
        condition: normalizedCondition,
        price: parseFloat(price),
        location: city,
        images: imageArray,
        status: dbStatus
      }])
      .select();

    if (error) {
      console.error("Error creating listing:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to create listing",
        details: error.message
      });
    }

    console.log('Listing created successfully:', listing);

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: listing[0]
    });

  } catch (error) {
    console.error("Error in create listing route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
});

// GET all listings with filters
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, condition, verified, searchQuery } = req.query;

    // Start building the query
    // We include user verification status using a join
    let query = supabase
      .from('listings')
      .select(`
        *,
        seller:users!user_id (
          is_verified,
          full_name,
          profile_image_url
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Apply category filter
    if (category && category !== '') {
      query = query.eq('category', category);
    }

    // Apply price range filters
    if (minPrice) {
      query = query.gte('price', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice));
    }

    // Apply condition filter
    if (condition && condition !== '') {
      query = query.eq('condition', condition);
    }

    // Apply search query (simple title/description search)
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching listings:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch listings",
        details: error.message
      });
    }

    // Apply verification filter in memory (easier with Supabase joins for this case)
    let filteredData = data;
    if (verified === 'true') {
      filteredData = data.filter(listing => listing.seller?.is_verified === true);
    }

    res.status(200).json({
      success: true,
      message: "Listings fetched successfully",
      count: filteredData.length,
      originalCount: data.length,
      data: filteredData
    });

  } catch (error) {
    console.error("Error in listings route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// GET a single listing by ID with view counting
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || null;
  const userAgent = req.get('User-Agent');
  const ip = req.ip;

  try {
    // First get the listing
    const { data: listing, error: fetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error("Error fetching listing:", fetchError);
      return res.status(404).json({
        success: false,
        error: "Listing not found",
        details: fetchError.message
      });
    }

    // Increment view count (this will only increment if it's a unique view)
    try {
      // Set the user agent for the current session
      await supabase.rpc('set_user_agent', { user_agent: userAgent });

      // Call the increment_view_count function
      await supabase.rpc('increment_view_count', {
        listing_id_param: id,
        user_id_param: userId
      });
    } catch (viewError) {
      console.error("Error incrementing view count:", viewError);
      // Don't fail the request if view counting fails
    }

    // Check if the current user has favorited this listing
    let isFavorited = false;
    if (userId) {
      const { data: favorite, error: favoriteError } = await supabase
        .from('favorites')
        .select('id')
        .eq('listing_id', id)
        .eq('user_id', userId)
        .single();

      isFavorited = !!favorite && !favoriteError;
    }

    // Get the updated listing with view count
    const { data: updatedListing } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    res.status(200).json({
      success: true,
      message: "Listing fetched successfully",
      data: {
        ...updatedListing,
        is_favorited: isFavorited
      }
    });

  } catch (error) {
    console.error("Error in listings route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Toggle favorite status for a listing
router.post('/:id/favorite',
  async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    try {
      // Check if already favorited
      const { data: existingFavorite, error: fetchError } = await supabase
        .from('favorites')
        .select('id')
        .eq('listing_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingFavorite) {
        // Remove from favorites
        const { error: removeError } = await supabase
          .from('favorites')
          .delete()
          .eq('id', existingFavorite.id);

        if (removeError) throw removeError;

        // Get current favorite count
        const { count: favCount, error: countError } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', id);

        if (!countError && favCount !== null) {
          // Update listing's favorite count
          await supabase
            .from('listings')
            .update({ favorites: Math.max(0, favCount) })
            .eq('id', id);
        }

        return res.status(200).json({
          success: true,
          message: 'Removed from favorites',
          is_favorited: false
        });
      } else {
        // Add to favorites
        const { data: favorite, error: addError } = await supabase
          .from('favorites')
          .insert([
            {
              user_id: userId,
              listing_id: id
            }
          ])
          .select()
          .single();

        if (addError) throw addError;

        // Get updated favorite count
        const { count: favCount, error: countError } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('listing_id', id);

        if (!countError && favCount !== null) {
          // Update listing's favorite count
          await supabase
            .from('listings')
            .update({ favorites: favCount })
            .eq('id', id);
        }

        return res.status(201).json({
          success: true,
          message: 'Added to favorites',
          is_favorited: true,
          data: favorite
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update favorite status',
        details: error.message
      });
    }
  }
);

// Get user's favorite listings
router.get('/user/favorites', async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select(`
        id,
        created_at,
        listing:listings!inner(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: favorites.map(fav => ({
        ...fav.listing,
        is_favorited: true
      }))
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch favorites',
      details: error.message
    });
  }
});

// Get popular listings (most viewed)
router.get('/explore/popular', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('views', { ascending: false })
      .limit(10);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching popular listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch popular listings',
      details: error.message
    });
  }
});

module.exports = router;
