require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
const allowedOrigins = [
  'https://yavuli.netlify.app',
  'https://www.yavuli.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://192.168.1.7:3001',
  "https://yavuli.app",
  "https://www.yavuli.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/$/, ""));

    if (!isAllowed) {
      console.log('Blocked by CORS:', origin); // Log blocked origins for debugging
      return callback(null, false);
    }
    return callback(null, true);
  },
  credentials: false // Set to false since app uses Bearer tokens, not cookies
}));

// Security Headers to prevent Clickjacking and other attacks
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout protection
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000);
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const listingsRoutes = require('./routes/listings');
const chatRoutes = require('./routes/chat');
const paymentsRoutes = require('./routes/payments.js');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');

// Use routes
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', reportsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Yavuli Marketplace API',
    for_routes: "goto /api to get all included routes"
  });
});


app.get('/health', (req, res) => {
  res.status(200).json({
    message: "Server is healthy and running successfully!"
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Yavuli API',
    availableEndpoints: {
      auth: '/api/auth',
      listings: '/api/listings',
      chat: '/api/chat',
      payments: '/api/payments',
      users: '/api/users',
      reports: '/api/reports'
    }
  });
});

// Debug endpoint to check if payments route is registered
app.get('/api/debug/routes', (req, res) => {
  res.json({
    message: 'Routes are registered',
    timestamp: new Date().toISOString()
  });
});

// Handle 404s for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler (must be last middleware)
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
});

module.exports = app;
