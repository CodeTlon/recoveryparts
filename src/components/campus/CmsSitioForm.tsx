'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { actualizarSitioConfigAction } from '@/lib/actions/cms'
import type { ActionState } from '@/lib/actions/auth'

const input = 'px-4 py-2.5 border border-outline-variant rounded bg-surface-container text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-accent transition-colors w-full'
const label = 'text-xs font-semibold uppercase tracking-wider text-on-surface-variant block mb-1.5'
const field = 'flex flex-col'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="py-3 px-8 text-sm font-semibold uppercase tracking-wide bg-accent text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60">
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </button>
  )
}

export type SitioConfig = {
  hero: { titulo?: string; subtitulo?: string; imagen_url?: string }
  areas: { tecnico?: { titulo?: string; descripcion?: string }; diseno?: { titulo?: string; descripcion?: string } }
  stats: { aulas?: number; profesores?: number; egresados?: number }
  contacto: { whatsapp?: string; direccion?: string; instagram?: string; email?: string }
}

export function CmsSitioForm({ config }: { config: SitioConfig }) {
  const [state, formAction] = useFormState(actualizarSitioConfigAction, {} as ActionState)

  return (
    <form action={formAction} className="space-y-8">
      {state.error && <p role="alert" className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded px-4 py-2.5">{state.error}</p>}
      {state.success && <p className="text-sm text-on-surface bg-surface-container-high border border-outline-variant rounded px-4 py-2.5">{state.success}</p>}

      <fieldset className="bg-surface-container-low border border-outline-variant rounded-lg p-6 space-y-3">
        <legend className="text-lg font-semibold text-on-surface px-1">Hero</legend>
        <div className={field}><span className={label}>Título</span><input name="hero_titulo" required defaultValue={config.hero.titulo} className={input} /></div>
        <div className={field}><span className={label}>Subtítulo</span><input name="hero_subtitulo" required defaultValue={config.hero.subtitulo} className={input} /></div>
        <div className={field}><span className={label}>Imagen de fondo (URL)</span><input name="hero_imagen_url" required defaultValue={config.hero.imagen_url} className={input} /></div>
      </fieldset>

      <fieldset className="bg-surface-container-low border border-outline-variant rounded-lg p-6 space-y-3">
        <legend className="text-lg font-semibold text-on-surface px-1">Áreas</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className={field}><span className={label}>Técnico — título</span><input name="area_tecnico_titulo" required defaultValue={config.areas.tecnico?.titulo} className={input} /></div>
            <div className={field}><span className={label}>Técnico — descripción</span><textarea name="area_tecnico_descripcion" required defaultValue={config.areas.tecnico?.descripcion} rows={3} className={input} /></div>
          </div>
          <div className="space-y-2">
            <div className={field}><span className={label}>Diseño — título</span><input name="area_diseno_titulo" required defaultValue={config.areas.diseno?.titulo} className={input} /></div>
            <div className={field}><span className={label}>Diseño — descripción</span><textarea name="area_diseno_descripcion" required defaultValue={config.areas.diseno?.descripcion} rows={3} className={input} /></div>
          </div>
        </div>
      </fieldset>

      <fieldset className="bg-surface-container-low border border-outline-variant rounded-lg p-6 space-y-3">
        <legend className="text-lg font-semibold text-on-surface px-1">Números (stats)</legend>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className={field}><span className={label}>Aulas</span><input type="number" name="stat_aulas" required defaultValue={config.stats.aulas ?? 3} className={input} /></div>
          <div className={field}><span className={label}>Profesores</span><input type="number" name="stat_profesores" required defaultValue={config.stats.profesores ?? 10} className={input} /></div>
          <div className={field}><span className={label}>Egresados</span><input type="number" name="stat_egresados" required defaultValue={config.stats.egresados ?? 0} className={input} /></div>
        </div>
      </fieldset>

      <fieldset className="bg-surface-container-low border border-outline-variant rounded-lg p-6 space-y-3">
        <legend className="text-lg font-semibold text-on-surface px-1">Contacto</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className={field}><span className={label}>WhatsApp (549…)</span><input name="whatsapp" required defaultValue={config.contacto.whatsapp} className={input} /></div>
          <div className={field}><span className={label}>Email de contacto</span><input type="email" name="email_contacto" required defaultValue={config.contacto.email} className={input} /></div>
          <div className={field}><span className={label}>Dirección</span><input name="direccion" required defaultValue={config.contacto.direccion} className={input} /></div>
          <div className={field}><span className={label}>Instagram (opcional)</span><input name="instagram" defaultValue={config.contacto.instagram} className={input} /></div>
        </div>
      </fieldset>

      <SubmitButton />
    </form>
  )
}
