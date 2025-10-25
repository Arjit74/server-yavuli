const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all users
router.get('/', async (req, res) => {
  try {
    // Fetch all users from Supabase
    const { data, error } = await supabase.from('users').select('*');

    if (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch users",
        details: error.message
      });
    }

    // Return the users data
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      count: data.length,
      data: data
    });

  } catch (error) {
    console.error("Error in user route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// GET a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch user by ID
    const { data, error } = await supabase .from('users').select('*') .eq('id', id) .single();
     
    if (error) {
      console.error(`Error fetching user:${id}`, error);
      return res.status(404).json({
        success: false,
        error: "User not found",
        details: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: data
    });

  } catch (error) {
    console.error("Error in user route:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

module.exports = router;
