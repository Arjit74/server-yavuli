// src/keep-alive.js
const https = require('https');
const { URL } = require('url');

const pingInterval = 14 * 60 * 1000; // 14 minutes
const siteUrl = process.env.RENDER_EXTERNAL_URL || 'https://your-render-app.onrender.com';

function pingServer() {
  const url = new URL(siteUrl);
  
  const options = {
    hostname: url.hostname,
    port: 443,
    path: '/health',
    method: 'GET'
  };

  const req = https.request(options, (res) => {
    console.log(`Ping successful at ${new Date().toISOString()}`);
  });

  req.on('error', (error) => {
    console.error('Ping failed:', error.message);
  });

  req.end();
}

// Initial ping
pingServer();
// Then ping every 14 minutes
setInterval(pingServer, pingInterval);