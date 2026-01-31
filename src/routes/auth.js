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

// Create or sync user record in database (called after signup)
router.post('/sync-user', authMiddleware, async (req, res) => {
  try {
    const { full_name, city, college, phone } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User information missing'
      });
    }

    console.log('Syncing user to database:', { userId, userEmail, full_name, city, college });

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name, location, phone')
      .eq('id', userId)
      .single();

    // If user doesn't exist, create them
    if (!existingUser && fetchError?.code === 'PGRST116') {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: userEmail,
          full_name: full_name || userEmail.split('@')[0],
          location: city || null,
          phone: phone || null,
          // Note: college is not in the users table, it's user_metadata in auth
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create user record',
          error: insertError.message
        });
      }

      console.log('User created successfully:', newUser);
      return res.status(201).json({
        success: true,
        message: 'User record created',
        data: newUser
      });
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingUser) {
      const updates = {};
      if (full_name && full_name !== existingUser.full_name) {
        updates.full_name = full_name;
      }
      if (city && city !== existingUser.location) {
        updates.location = city;
      }
      if (phone && phone !== existingUser.phone) {
        updates.phone = phone;
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating user record:', updateError);
          return res.status(500).json({
            success: false,
            message: 'Failed to update user record',
            error: updateError.message
          });
        }

        return res.status(200).json({
          success: true,
          message: 'User record updated'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'User already exists'
    });

  } catch (error) {
    console.error('Error in sync-user route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync user',
      error: error.message
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
