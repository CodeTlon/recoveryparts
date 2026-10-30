import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Clock, ArrowUpRight } from 'lucide-react'
import { getSettings, hayAulasVisibles, waLink } from '@/lib/data'
import { WhatsAppIcon, InstagramIcon } from './SocialIcons'

// Pie compacto: la marca y los datos en columnas («Visitanos», «Contacto», «Sitio») y el copyright. En el celular el teléfono llama, el mail abre el correo, la dirección abre el mapa y WhatsApp abre el chat.
// Solo se muestra lo que está cargado en el CMS.
export default async function SiteFooter() {
  const [{ contacto: c, textos }, conAulas] = await Promise.all([getSettings(), hayAulasVisibles()])
  const wa = waLink(c.whatsapp)
  const ig = c.instagram?.replace('@', '')
  const mapa = c.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.direccion}, Córdoba`)}` : null
  const tel = c.telefono ? `tel:${c.telefono.replace(/[^\d+]/g, '')}` : null
  const titulo = 'display mb-5 text-base [font-stretch:105%]'
  const fila = 'flex gap-3'
  const icono = 'mt-0.5 shrink-0 text-accent'
  const enlace = '-my-2 inline-block py-2 underline-offset-4 transition-colors hover:text-accent hover:underline'
  const lnk = 'inline-flex min-h-10 items-center text-sm text-on-surface-variant transition-colors hover:text-on-surface'

  return (
    <footer className="relative w-full border-t border-outline-variant/70 bg-surface-container-low">
      {/* Acento naranja sobre el borde: el mismo gesto que las tarjetas de área. */}
      <span aria-hidden className="absolute -top-px left-0 h-px w-24 bg-accent md:w-40" />
      <div className="mx-auto max-w-[1280px] px-4 pt-14 md:px-12 md:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.05fr_1fr_1.4fr_0.75fr] lg:gap-12">
          <div>
            <Link href="/" className="-my-1 inline-flex items-center gap-3 py-1">
              <Image src="/images/logo.png" alt="" width={96} height={96} className="h-10 w-10" />
              <span className="display text-xl [font-stretch:110%]">Recovery Parts</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-on-surface-variant">{textos.pie.descripcion}</p>
          </div>

          {(c.direccion || c.horario) && (
            <section aria-labelledby="pie-visitanos">
              <h2 id="pie-visitanos" className={titulo}>Visitanos</h2>
              <ul className="space-y-4 text-sm">
                {c.direccion && (
                  <li className={fila}><MapPin size={17} aria-hidden className={icono} />
                    <span><span className="block font-semibold">{c.direccion}</span>
                      {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className={`${enlace} text-on-surface-variant`}>Cómo llegar <ArrowUpRight size={13} aria-hidden className="inline" /></a>}</span>
                  </li>
                )}
                {c.horario && <li className={fila}><Clock size={17} aria-hidden className={icono} /><span className="text-on-surface-variant">{c.horario}</span></li>}
              </ul>
            </section>
          )}

          {(tel || c.email || wa || ig) && (
            <section aria-labelledby="pie-contacto">
              <h2 id="pie-contacto" className={titulo}>Contacto</h2>
              <ul className="space-y-4 text-sm">
                {wa && <li className={fila}><WhatsAppIcon size={17} className={icono} /><a href={wa} target="_blank" rel="noopener noreferrer" className={`${enlace} font-semibold`}>Escribinos por WhatsApp</a></li>}
                {tel && <li className={fila}><Phone size={17} aria-hidden className={icono} /><a href={tel} className={`${enlace} tabular-nums`}>{c.telefono}</a></li>}
                {c.email && <li className={fila}><Mail size={17} aria-hidden className={icono} /><a href={`mailto:${c.email}`} className={`${enlace} [overflow-wrap:anywhere]`}>{c.email}</a></li>}
                {ig && <li className={fila}><InstagramIcon size={17} className={icono} /><a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className={enlace}>@{ig}</a></li>}
              </ul>
            </section>
          )}

          <nav aria-labelledby="pie-sitio">
            <h2 id="pie-sitio" className={titulo}>Sitio</h2>
            <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-1">
              <li><Link href="/cursos" className={lnk}>Cursos y talleres</Link></li>
              {conAulas && <li><Link href="/aulas" className={lnk}>Aulas</Link></li>}{/* RF-60: igual que el menú, solo con aulas visibles */}
              <li><Link href="/preguntas-frecuentes" className={lnk}>Preguntas frecuentes</Link></li>
              <li><Link href="/contacto" className={lnk}>Contacto</Link></li>
              <li><Link href="/login" className={`${lnk} gap-1 font-semibold text-on-surface`}>Campus <ArrowUpRight size={14} aria-hidden /></Link></li>
            </ul>
          </nav>
        </div>

        <p className="mt-12 border-t border-outline-variant/60 py-5 text-xs text-on-surface-variant">© {new Date().getFullYear()} Recovery Parts · Córdoba, Argentina</p>
      </div>
    </footer>
  )
}
