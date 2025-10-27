const express = require('express');
const router = express.Router();

// Test route for reports
router.get('/', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Reports route is working successfully!',
      data: {
        description: 'This is the reports endpoint. It will handle user and listing report submissions.'
      }
    });
  } catch (error) {
    console.error('Error in reports route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;