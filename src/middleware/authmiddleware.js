const supabase = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

// Check if token exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided. Please login first.'
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

 // Check if token is invalid or expired
    if (error || !user) {
      console.error('Token verification failed:', error?.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please login again.',
        error: error?.message
      });
    }

// Attach user info to request object for use in routes
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    console.log(' User authenticated:', user.email);

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};


module.exports = {
  authMiddleware
};