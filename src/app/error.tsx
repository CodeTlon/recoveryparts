'use client'

import { AlertTriangle } from 'lucide-react'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div role="alert" className="flex max-w-md flex-col items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-danger/15 text-danger"><AlertTriangle size={22} aria-hidden /></span>
        <h1 className="display text-3xl [font-stretch:105%]">Algo salió mal</h1>
        <p className="text-on-surface-variant">No pudimos cargar esta página. Probá de nuevo en unos segundos.</p>
        <button onClick={reset} className="btn-primary">Reintentar</button>
      </div>
    </main>
  )
}
