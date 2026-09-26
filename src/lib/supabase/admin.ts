import { createClient } from '@supabase/supabase-js'

// SOLO server-side (Server Actions / Route Handlers). Nunca importar desde un Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
