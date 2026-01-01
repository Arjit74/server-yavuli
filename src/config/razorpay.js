const Razorpay = require('razorpay');

let razorpayInstance = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn('⚠️ Razorpay keys not configured. Payment functionality will not work.');
  // Create a dummy object to prevent module loading errors
  razorpayInstance = {
    orders: {
      create: async () => {
        throw new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment variables.');
      }
    }
  };
}

module.exports = razorpayInstance;