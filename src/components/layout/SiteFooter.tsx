import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Clock, ArrowUpRight, ArrowRight } from 'lucide-react'
import { getSettings, hayAulasVisibles, waLink } from '@/lib/data'
import { WhatsAppIcon, InstagramIcon } from './SocialIcons'

// Pie en tres franjas: la invitación a consultar (reemplaza al cierre de contacto que tenía la portada), los datos en
// columnas («Visitanos», «Contacto», «Sitio») y la firma con el nombre grande en Archivo expandido (se corre de ancho al
// pasar el mouse). En el celular el teléfono llama, el mail abre el correo y la dirección abre el mapa. Solo se muestra
// lo que está cargado en el CMS.
export default async function SiteFooter() {
  const [{ contacto: c }, conAulas] = await Promise.all([getSettings(), hayAulasVisibles()])
  const wa = waLink(c.whatsapp)
  const ig = c.instagram?.replace('@', '')
  const mapa = c.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.direccion}, Córdoba`)}` : null
  const tel = c.telefono ? `tel:${c.telefono.replace(/[^\d+]/g, '')}` : null
  const titulo = 'dato mb-4 text-on-surface-variant'
  const fila = 'flex gap-3'
  const icono = 'mt-0.5 shrink-0 text-accent'
  const enlace = '-my-2 inline-block py-2 underline-offset-4 transition-colors hover:text-accent hover:underline'
  const lnk = 'inline-flex min-h-10 items-center text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface'

  return (
    <footer className="relative w-full overflow-hidden border-t border-outline-variant/60 bg-surface-container-lowest/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-16 md:px-12 md:pt-24">
        {/* 1 · Invitación */}
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-7">
            <p className="display text-[clamp(2.1rem,5.2vw,4.2rem)]">¿Arrancamos? Escribinos.</p>
            <p className="mt-4 max-w-md text-lg text-on-surface-variant">Consultanos por cursos, horarios o talleres. Te respondemos enseguida.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-5 md:justify-end">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary px-6! py-3.5!"><WhatsAppIcon size={18} /> Consultar por WhatsApp</a>}
            <Link href="/contacto" className={`${wa ? 'btn-outline' : 'btn-primary'} px-6! py-3.5!`}>Escribinos <ArrowRight size={16} aria-hidden /></Link>
          </div>
        </div>

        {/* 2 · Datos y navegación */}
        <div className="mt-14 grid gap-10 border-t border-outline-variant/60 pt-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.3fr_0.8fr] lg:gap-12">
          {(c.direccion || c.horario) && (
            <section aria-labelledby="pie-visitanos">
              <h2 id="pie-visitanos" className={titulo}>Visitanos</h2>
              <ul className="space-y-4">
                {c.direccion && (
                  <li className={fila}><MapPin size={18} aria-hidden className={icono} />
                    <span><span className="block font-semibold">{c.direccion}</span>
                      {mapa && <a href={mapa} target="_blank" rel="noopener noreferrer" className={`${enlace} text-sm text-on-surface-variant`}>Cómo llegar <ArrowUpRight size={13} aria-hidden className="inline" /></a>}</span>
                  </li>
                )}
                {c.horario && <li className={fila}><Clock size={18} aria-hidden className={icono} /><span>{c.horario}</span></li>}
              </ul>
            </section>
          )}
          {(tel || c.email || ig) && (
            <section aria-labelledby="pie-contacto">
              <h2 id="pie-contacto" className={titulo}>Contacto</h2>
              <ul className="space-y-4">
                {tel && <li className={fila}><Phone size={18} aria-hidden className={icono} /><a href={tel} className={`${enlace} font-semibold tabular-nums`}>{c.telefono}</a></li>}
                {c.email && <li className={fila}><Mail size={18} aria-hidden className={icono} /><a href={`mailto:${c.email}`} className={`${enlace} [overflow-wrap:anywhere]`}>{c.email}</a></li>}
              </ul>
              {/* WhatsApp ya está en la invitación de arriba. */}
              {ig && <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-3 rounded-lg border border-outline-variant px-4 text-sm font-semibold text-on-surface-variant transition-colors hover:border-accent hover:text-on-surface"><InstagramIcon size={18} /> @{ig}</a>}
            </section>
          )}
          <nav aria-labelledby="pie-sitio">
            <h2 id="pie-sitio" className={titulo}>Sitio</h2>
            <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-1">
              <li><Link href="/" className={lnk}>Inicio</Link></li>
              <li><Link href="/cursos" className={lnk}>Cursos y talleres</Link></li>
              {conAulas && <li><Link href="/aulas" className={lnk}>Aulas</Link></li>}{/* RF-60: igual que el menú, solo con aulas visibles */}
              <li><Link href="/preguntas-frecuentes" className={lnk}>Preguntas frecuentes</Link></li>
              <li><Link href="/contacto" className={lnk}>Contacto</Link></li>
              <li><Link href="/login" className={`${lnk} gap-1`}>Campus <ArrowUpRight size={14} aria-hidden /></Link></li>
            </ul>
          </nav>
        </div>

        {/* 3 · Firma */}
        <Link href="/" aria-label="Recovery Parts, inicio" className="group mt-16 flex items-center gap-3 text-on-surface md:gap-5">
          <Image src="/images/logo.png" alt="" width={96} height={96} className="h-11 w-11 shrink-0 md:h-20 md:w-20" />
          <span aria-hidden className="display block text-[clamp(1.75rem,8vw,8.5rem)] leading-[0.9] transition-[font-stretch] duration-700 ease-(--ease-out) [font-stretch:100%] group-hover:[font-stretch:125%]">Recovery Parts</span>
        </Link>
        <p className="mt-8 border-t border-outline-variant/60 pt-6 text-sm text-on-surface-variant">© {new Date().getFullYear()} Recovery Parts · Academia de cursos y talleres presenciales · Córdoba, Argentina.</p>
      </div>
    </footer>
  )
}
