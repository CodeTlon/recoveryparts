import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Estos tokens son leídos desde CSS variables definidas en globals.css
        // que a su vez son seteadas por demo-config.ts via layout.tsx
        demo: {
          bg: 'var(--demo-bg)',
          surface: 'var(--demo-surface)',
          'surface-alt': 'var(--demo-surface-alt)',
          heading: 'var(--demo-heading)',
          text: 'var(--demo-text)',
          muted: 'var(--demo-muted)',
          border: 'var(--demo-border)',
          accent: 'var(--demo-accent)',
          'on-accent': 'var(--demo-on-accent)',
          structural: 'var(--demo-structural)',
          'on-structural': 'var(--demo-on-structural)',
        },
        // Paleta "Industrial Technical Narrative" del DESIGN.md de Stitch
        // (páginas internas: /plataforma, /curso, /login).
        surface: '#08132a',
        'surface-container-lowest': '#030d25',
        'surface-container-low': '#101b33',
        'surface-container': '#151f37',
        'surface-container-high': '#1f2942',
        'surface-container-highest': '#2a344d',
        'on-surface': '#d9e2ff',
        'on-surface-variant': '#c5c6cd',
        outline: '#8f9097',
        'outline-variant': '#44474d',
        primary: '#b9c7e4',
        'primary-container': '#0a192f',
        secondary: '#ffb59d',
        'secondary-container': '#b83900',
        'on-secondary-container': '#ffddd2',
        tertiary: '#bcc6e6',
        'tertiary-container': '#0d1830',
        'on-tertiary-container': '#77819f',
        accent: '#ff6b35', // naranja industrial (CTA / progreso)
      },
      fontFamily: {
        demo: ['var(--demo-font)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
