import type { Config } from 'tailwindcss'

// Paleta de marca (RNF-01): azul, naranja y blanco. Look oscuro "industrial"
// con primario azul y acento naranja.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1e3a8a', light: '#3b5bdb', dark: '#172b69' },
        accent: { DEFAULT: '#f97316', hover: '#ea580c' },
        surface: '#08132a',
        'surface-container-lowest': '#030d25',
        'surface-container-low': '#101b33',
        'surface-container': '#151f37',
        'surface-container-high': '#1f2942',
        'surface-container-highest': '#2a344d',
        'on-surface': '#e6ecff',
        'on-surface-variant': '#c5c6cd',
        outline: '#8f9097',
        'outline-variant': '#44474d',
        primary: '#b9c7e4',
        'primary-container': '#0a192f',
        secondary: '#fdba74',
        'secondary-container': '#b83900',
        'on-secondary-container': '#ffddd2',
        tertiary: '#bcc6e6',
        'tertiary-container': '#0d1830',
        'on-tertiary-container': '#a3adc9',
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
