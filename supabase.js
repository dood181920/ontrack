var SUPABASE_URL = 'https://hwzeomglhfaeunqjcdkt.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_sedomcWMVrbyp7kpGCYYAg_1muwhWf_';
var supabaseClient = null;
var supabaseReady = false;

try {
  if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseReady = true;
  }
} catch (e) {
  console.error('Supabase init failed:', e);
}
