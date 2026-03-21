import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if(supabaseUrl === 'https://placeholder.supabase.co') {
   console.warn('[Supabase] Missing environment variables for connection. Using placeholder.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
