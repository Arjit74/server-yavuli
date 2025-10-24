const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    res.status(200).json({
      message: "user route is working successfully!"
    });
  } catch (error) {
    console.error("Error in fetching user route:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

module.exports = router;
