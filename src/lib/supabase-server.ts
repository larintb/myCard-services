import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This file must only be used server-side.')
}

// Admin client with service role permissions (bypasses RLS)
// NEVER import this in client components or pages — server/API routes only
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
