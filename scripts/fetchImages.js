const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getImages() {
    const { data, error } = await supabase.from('listings').select('images').limit(20);
    if (error) {
        console.error(error);
        process.exit(1);
    }
    const allImages = data.flatMap(l => l.images);
    console.log('---IMAGE_LIST_START---');
    console.log(JSON.stringify([...new Set(allImages)]));
    console.log('---IMAGE_LIST_END---');
}

getImages();
