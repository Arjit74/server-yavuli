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
    console.log('--- CREATE LISTING START ---');
    console.log('User ID:', userId);
    console.log('Request body:', req.body);

    const { title, description, category, condition, price, originalPrice, city, college, reason, age, status = 'published', images = [] } = req.body;

    // Validation
    if (!title || !price || !description || !category || !condition) {
      const missing = [];
      if (!title) missing.push('title');
      if (!price) missing.push('price');
      if (!description) missing.push('description');
      if (!category) missing.push('category');
      if (!condition) missing.push('condition');

      console.log('Validation failed - Missing fields:', missing);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
        missingFields: missing
      });
    }

    // Normalize and validate condition
    const normalizedCondition = normalizeCondition(condition);
    if (!normalizedCondition) {
      console.log('Validation failed - Invalid condition:', condition);
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

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking user existence:', fetchError);
        // Continue but it might fail later
      }

      if (!existingUser) {
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
          return res.status(500).json({
            success: false,
            error: "User profile could not be initialized",
            details: createError.message
          });
        }
        console.log('User record created successfully');
      }
    } catch (userSyncError) {
      console.error('Critical error in user sync:', userSyncError);
      return res.status(500).json({
        success: false,
        error: "Internal error during user validation",
        details: userSyncError.message
      });
    }

    // Parse images
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

    // Convert status
    let dbStatus = 'active';
    if (status === 'draft') {
      dbStatus = 'draft';
    } else if (status === 'published') {
      dbStatus = 'active';
    }

    console.log('Inserting listing with status:', dbStatus);

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
        error: "Failed to create listing in database",
        details: error.message
      });
    }

    console.log('Listing created successfully:', listing[0].id);
    console.log('--- CREATE LISTING END ---');

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: listing[0]
    });

  } catch (error) {
    console.error("Fatal error in create listing route:", error);
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

// GET a single listing by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get the listing
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

    res.status(200).json({
      success: true,
      message: "Listing fetched successfully",
      data: listing
    });

  } catch (error) {
    console.error("Error in listings route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Note: Favoriting and Popular (view-based) routes have been removed as per requirements.

module.exports = router;
