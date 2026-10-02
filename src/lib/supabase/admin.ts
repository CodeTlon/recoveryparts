import 'server-only'
import { createClient } from '@supabase/supabase-js'

// service_role: se saltea RLS. SOLO en server actions / route handlers tras validar rol admin.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
