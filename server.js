require('dotenv').config();
const app = require('./src/app');

const port = process.env.PORT || 5000;

// 👇 IMPORTANT: bind to 0.0.0.0 instead of localhost
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server is running on http://0.0.0.0:${port}/`);
  console.log(`💓 Health check: http://0.0.0.0:${port}/health`);
});
