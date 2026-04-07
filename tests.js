// test-env.js
require('dotenv').config();

console.log('Variables loaded check:');
console.log('SUPABASE_URL      :', process.env.SUPABASE_URL       ? '✅' : '❌ MISSING');
console.log('SERVICE_ROLE_KEY  :', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ MISSING');
console.log('PAYTM_MID         :', process.env.PAYTM_MID          ? '✅' : '❌ MISSING');
console.log('PAYTM_MERCHANT_KEY:', process.env.PAYTM_MERCHANT_KEY ? '✅' : '❌ MISSING');
console.log('BACKEND_URL       :', process.env.BACKEND_URL         ? '✅' : '❌ MISSING');
console.log('---');
console.log('PAYTM_WEBSITE raw value:', JSON.stringify(process.env.PAYTM_WEBSITE));