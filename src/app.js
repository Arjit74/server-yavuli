require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
const allowedOrigins = [
  'https://yavuli.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(null, false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

module.exports = app;
