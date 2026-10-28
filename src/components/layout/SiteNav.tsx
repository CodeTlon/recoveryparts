import SiteNavCliente from './SiteNavCliente'
import CircuitField from '@/components/ui/CircuitField'
import { hayAulasVisibles } from '@/lib/data'

// Menú del sitio: el contenido es interactivo (cliente); acá solo se decide qué links mostrar.
// «Aulas» aparece solo si hay alguna visible (RF-60). La consulta sale del caché público del sitio.
// Todas las páginas públicas renderizan SiteNav, así que el fondo vivo de circuito (capa fija, detrás) se monta acá.
export default async function SiteNav() {
  return (
    <>
      <CircuitField modo="fondo" className="-z-10" />
      <SiteNavCliente conAulas={await hayAulasVisibles()} />
    </>
  )
}
