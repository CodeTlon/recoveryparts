import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const config = [
  ...coreWebVitals,
  ...typescript,
  // Patrones de hidratación existentes (leer localStorage/URL tras montar): se mantienen como aviso.
  { files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'], rules: { 'react-hooks/set-state-in-effect': 'warn', 'react-hooks/purity': 'warn', 'react-hooks/refs': 'warn', '@typescript-eslint/no-explicit-any': 'warn' } },
  { ignores: ['.next/**', 'node_modules/**', 'scripts/**', 'e2e/**', 'next-env.d.ts', 'test-results/**', 'playwright-report/**'] },
]

export default config
