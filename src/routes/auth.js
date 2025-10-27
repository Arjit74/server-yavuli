const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/authmiddleware');


router.get('/', (req, res) => {
  try {
    res.status(200).json({
      message: "Auth route is working successfully!"
    });
  } catch (error) {
    console.error("Error in fetching auth route:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// Simple login for testing (using Supabase Auth)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
// Ask superbase to verify credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error(' Login error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});


module.exports = router;
