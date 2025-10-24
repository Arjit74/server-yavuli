require('dotenv').config();
const app = require('./src/app');

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(` Server is running on http://localhost:${port}/`);
  console.log(`check server health on http://localhost:${port}/health`);
 
});
