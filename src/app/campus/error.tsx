'use client'

import { AlertTriangle } from 'lucide-react'

export default function CampusError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="card mx-auto mt-16 flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-red-600/20 text-red-300"><AlertTriangle size={22} /></span>
      <h1 className="text-xl font-bold">Algo salió mal</h1>
      <p className="text-on-surface-variant">No pudimos cargar esta sección. Probá de nuevo en unos segundos.</p>
      <button onClick={reset} className="btn-primary">Reintentar</button>
    </div>
  )
}
