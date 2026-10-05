'use client'

import { createContext, useContext, useRef } from 'react'
import { X } from 'lucide-react'

// Los formularios de adentro (ActionForm) cierran el modal al guardar vía este contexto.
const CloseCtx = createContext<(() => void) | null>(null)
export const useModalClose = () => useContext(CloseCtx)

// Botón que abre un modal (<dialog> nativo: foco atrapado, Esc cierra, fondo bloqueado).
export function ModalButton({ label, title, className = 'btn-ghost !px-3 !py-2', wide, children }: {
  label: React.ReactNode; title: string; className?: string; wide?: boolean; children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const close = () => ref.current?.close()
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog ref={ref} aria-label={title}
        onClick={(e) => { if (e.target === ref.current) close() }} // click en el fondo
        className={`m-auto w-[calc(100%-2rem)] rounded-card border border-outline-variant bg-surface-container p-0 text-on-surface shadow-card-hover backdrop:bg-black/60 backdrop:backdrop-blur-sm ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold text-primary">{title}</h2>
            <button type="button" onClick={close} aria-label="Cerrar" className="text-on-surface-variant hover:text-secondary"><X size={20} aria-hidden /></button>
          </div>
          <CloseCtx.Provider value={close}>{children}</CloseCtx.Provider>
        </div>
      </dialog>
    </>
  )
}
