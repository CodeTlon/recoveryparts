import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { siteUrl } from '@/lib/env'
import './globals.css'

// Fuente autoalojada (src/app/fonts, subset latin): el build no depende de Google Fonts. Ver FONTS.md.
const montserrat = localFont({ src: './fonts/montserrat-latin-wght-normal.woff2', weight: '100 900', variable: '--font-montserrat', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Recovery Parts — Academia de cursos técnicos', template: '%s · Recovery Parts' },
  description: 'Cursos y talleres presenciales de diseño y tecnología en Córdoba.',
  referrer: 'no-referrer',
  metadataBase: new URL(siteUrl()),
  // Sin canonical acá: lo heredaba toda página que no declara el suyo (/login, /activar…) y apuntaba a la portada.
  openGraph: { type: 'website', locale: 'es_AR', siteName: 'Recovery Parts', title: 'Recovery Parts — Academia de cursos técnicos', description: 'Cursos y talleres presenciales de diseño y tecnología en Córdoba.' },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={montserrat.variable}>
      <body>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:bg-accent focus:px-4 focus:py-2 focus:font-bold focus:text-surface">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  )
}
