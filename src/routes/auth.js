const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/authmiddleware');

// Define your URLs as constants
const FRONTEND_URL = 'https://yavuli.netlify.app';
const BACKEND_URL = 'https://server-yavuli.onrender.com';

// Health check
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

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Login error:', error);
      
      if (error.message.includes('Email not confirmed')) {
        return res.status(401).json({
          success: false,
          message: 'Please verify your email first',
          needsVerification: true
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: error.message
      });
    }

    if (!data.user.email_confirmed_at) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first',
        needsVerification: true
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        emailVerified: true
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

router.get('/google', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${FRONTEND_URL}/auth/callback`
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Google login failed',
        error: error.message
      });
    }

    // Return the URL for the client to redirect to
    res.status(200).json({
      success: true,
      message: 'Redirect to Google',
      url: data.url
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    console.log('✓ Resend verification route hit');
    console.log('Request body:', req.body);
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${FRONTEND_URL}/auth/verify`
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Failed to resend email',
        error: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification email sent! Check your inbox.',
      expiresIn: '24 hours'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
