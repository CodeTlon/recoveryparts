import SiteNavCliente from './SiteNavCliente'
import { hayAulasVisibles } from '@/lib/data'

// Menú del sitio: el contenido es interactivo (cliente); acá solo se decide qué links mostrar.
// «Aulas» aparece solo si hay alguna visible (RF-60). La consulta sale del caché público del sitio.
export default async function SiteNav() {
  return <SiteNavCliente conAulas={await hayAulasVisibles()} />
}
