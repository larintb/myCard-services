import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

// Admin client with service role permissions (bypasses RLS).
// Lazily instantiated so the module can be imported without crashing
// during Next.js build-time static analysis.
// NEVER import this in client components or pages — server/API routes only.
export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This must only be called server-side at request time.')
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  return _client
}

// Convenience re-export for the common pattern `supabaseAdmin.from(...)`
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop]
  }
})
