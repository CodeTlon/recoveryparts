import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente con la sesión del usuario (respeta RLS). Cookies httpOnly las maneja @supabase/ssr.
export async function createClient() {
  const store = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options))
          } catch {
            // Server Component: el middleware refresca la sesión.
          }
        },
      },
    }
  )
}
