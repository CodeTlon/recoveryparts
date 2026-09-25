import type { Metadata } from 'next'
import { Inter, Playfair_Display, Montserrat, Roboto, Lato, Open_Sans, Poppins, Raleway, Oswald, Nunito } from 'next/font/google'
import './globals.css'
import { demoConfig } from '@/lib/demo-config'

// Fuentes pre-cargadas disponibles para demos
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' })
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-roboto' })
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-lato' })
const openSans = Open_Sans({ subsets: ['latin'], variable: '--font-opensans' })
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-poppins' })
const raleway = Raleway({ subsets: ['latin'], variable: '--font-raleway' })
const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald' })
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' })

const FONT_MAP: Record<string, string> = {
  'Inter': '--font-inter',
  'Playfair Display': '--font-playfair',
  'Montserrat': '--font-montserrat',
  'Roboto': '--font-roboto',
  'Lato': '--font-lato',
  'Open Sans': '--font-opensans',
  'Poppins': '--font-poppins',
  'Raleway': '--font-raleway',
  'Oswald': '--font-oswald',
  'Nunito': '--font-nunito',
}

export const metadata: Metadata = {
  title: demoConfig.business.name,
  description: demoConfig.business.tagline,
}

const RADIUS_MAP: Record<string, [string, string]> = {
  sharp: ['0.25rem', '0.5rem'],   // industrial / brutalista
  soft:  ['0.5rem', '0.75rem'],
  round: ['0.75rem', '1rem'],     // suave / luxury (default)
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { brand, style } = demoConfig
  const fontVar = FONT_MAP[brand.font] ?? '--font-inter'
  const [radius, radiusLg] = RADIUS_MAP[style.radius] ?? RADIUS_MAP.round

  const cssVars = {
    '--demo-bg': brand.background,
    '--demo-surface': brand.surface,
    '--demo-surface-alt': brand.surfaceAlt,
    '--demo-heading': brand.heading,
    '--demo-text': brand.text,
    '--demo-muted': brand.muted,
    '--demo-border': brand.border,
    '--demo-accent': brand.accent,
    '--demo-on-accent': brand.onAccent,
    '--demo-structural': brand.structural,
    '--demo-on-structural': brand.onStructural,
    '--demo-font': `var(${fontVar})`,
    '--demo-radius': radius,
    '--demo-radius-lg': radiusLg,
  } as React.CSSProperties

  const allFontVars = [
    inter.variable,
    playfair.variable,
    montserrat.variable,
    roboto.variable,
    lato.variable,
    openSans.variable,
    poppins.variable,
    raleway.variable,
    oswald.variable,
    nunito.variable,
  ].join(' ')

  return (
    <html lang="es" className={allFontVars} data-cards={style.cards}>
      <body style={cssVars}>
        {children}
      </body>
    </html>
  )
}
