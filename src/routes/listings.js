const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { body, validationResult } = require('express-validator');

// GET all listings
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('listings') .select('*');
 //fail
    if (error) {
      console.error("Error fetching listings:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch listings",
        details: error.message
      });
    }
//pass
    res.status(200).json({
      success: true,
      message: "Listings fetched successfully",
      count: data.length,
      data: data
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
