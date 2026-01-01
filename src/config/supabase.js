const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://iicvtlvcdmuxnhyithkr.supabase.co';
// Use SERVICE_ROLE_KEY for server-side auth verification
// Do NOT use ANON_KEY on the server - it lacks permission to verify tokens
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
