import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Public client for client-side usage (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// NOTE: For server-side operations (API routes), import supabaseAdmin from '@/lib/supabase-server'