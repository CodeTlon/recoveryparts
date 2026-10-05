export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
// Sin esta variable las invitaciones y los resets apuntarían a localhost. No se corta el build (CI compila sin variables).
if (process.env.NODE_ENV === 'production' && supabaseConfigured && !process.env.NEXT_PUBLIC_SITE_URL)
  console.error('env: falta NEXT_PUBLIC_SITE_URL; los links de invitación apuntarán a localhost')
