'use client'

import { Trash2 } from 'lucide-react'
import { togglePublicadoAction } from '@/lib/actions/cms'

export function PublicadoToggle({ tabla, id, publicado }: { tabla: 'galeria_fotos' | 'testimonios' | 'faq' | 'egresados'; id: number; publicado: boolean }) {
  return (
    <form action={togglePublicadoAction.bind(null, tabla, id, !publicado)}>
      <button type="submit" className={`text-xs font-semibold px-2 py-1 rounded ${publicado ? 'bg-accent text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
        {publicado ? 'Publicado' : 'Oculto'}
      </button>
    </form>
  )
}

export function DeleteButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button type="submit" title="Eliminar" className="text-on-surface-variant hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
    </form>
  )
}
