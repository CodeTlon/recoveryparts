import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' })

export const metadata: Metadata = {
  title: { default: 'Recovery Parts — Academia de cursos técnicos', template: '%s · Recovery Parts' },
  description: 'Cursos y talleres presenciales de diseño y tecnología en Córdoba.',
  referrer: 'no-referrer',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: { type: 'website', locale: 'es_AR', siteName: 'Recovery Parts', title: 'Recovery Parts — Academia de cursos técnicos', description: 'Cursos y talleres presenciales de diseño y tecnología en Córdoba.' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={montserrat.variable}>
      <body>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-accent focus:px-4 focus:py-2 focus:font-bold focus:text-surface">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  )
}
