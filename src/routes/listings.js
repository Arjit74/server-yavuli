const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

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

// GET a single listing by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase .from('listings').select('*').eq('id', id).single();
//fail
    if (error) {
      console.error("Error fetching listing:", error);
      return res.status(404).json({
        success: false,
        error: "Listing not found",
        details: error.message
      });
    }
//pass
    res.status(200).json({
      success: true,
      message: "Listing fetched successfully",
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

module.exports = router;
