import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' })

export const metadata: Metadata = {
  title: { default: 'Recovery Parts — Academia de cursos técnicos', template: '%s · Recovery Parts' },
  description: 'Cursos y talleres presenciales de diseño y tecnología en Córdoba.',
  referrer: 'no-referrer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  )
}
