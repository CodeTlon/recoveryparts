export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

// Evita open redirect: `next` viene de un query param (armado por el
// middleware o por un link de mail) — sin este chequeo, una URL absoluta
// (`https://evil.com`) o `//evil.com` se colaría como destino del redirect.
export function safeNextPath(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  try {
    new URL(next)
    return fallback
  } catch {
    return next
  }
}
