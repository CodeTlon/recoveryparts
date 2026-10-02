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
      // Tokens de forma y profundidad: todo componente nuevo los usa en vez de valores sueltos.
      borderRadius: {
        card: '0.75rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(230,236,255,0.04) inset, 0 8px 24px -12px rgba(3,13,37,0.8)',
        'card-hover': '0 1px 0 0 rgba(230,236,255,0.06) inset, 0 16px 40px -16px rgba(249,115,22,0.35)',
        glow: '0 0 0 1px rgba(249,115,22,0.35), 0 0 32px -4px rgba(249,115,22,0.35)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
