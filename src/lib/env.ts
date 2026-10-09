export const dbConfigured = Boolean(process.env.DATABASE_URL)

// URL pública del sitio para armar links en mails. Se lee en runtime con acceso indirecto a process.env:
// `process.env.NEXT_PUBLIC_*` se incrusta en el build, y en Docker el build corre antes de que Coolify
// inyecte las variables del entorno.
const env = process.env as Record<string, string | undefined>
export const siteUrl = () => env.SITE_URL ?? env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

if (env.NODE_ENV === 'production' && dbConfigured && !env.SITE_URL && !env.NEXT_PUBLIC_SITE_URL)
  console.error('env: falta NEXT_PUBLIC_SITE_URL; los links de invitación apuntarán a localhost')
