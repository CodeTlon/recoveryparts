import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Clock, ArrowUpRight } from 'lucide-react'
import { getSettings, hayAulasVisibles, waLink } from '@/lib/data'
import { WhatsAppIcon, InstagramIcon } from './SocialIcons'

// Pie «declaración»: el nombre grande en Archivo expandido (se corre de ancho al pasar el mouse), los datos de contacto
// reales del CMS en bloques legibles y la navegación en una sola fila. Sin datos cargados, ese bloque no se muestra.
export default async function SiteFooter() {
  const [{ contacto: c }, conAulas] = await Promise.all([getSettings(), hayAulasVisibles()])
  const wa = waLink(c.whatsapp)
  const ig = c.instagram?.replace('@', '')
  const lnk = 'inline-flex min-h-10 items-center text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface'
  const red = 'flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:border-accent hover:text-on-surface'
  const datos = [
    c.direccion && { icono: MapPin, texto: c.direccion, titulo: 'Dirección' },
    c.horario && { icono: Clock, texto: c.horario, titulo: 'Horario' },
    c.telefono && { icono: Phone, texto: c.telefono, titulo: 'Teléfono' },
  ].filter(Boolean) as { icono: typeof MapPin; texto: string; titulo: string }[]

  return (
    <footer className="relative w-full overflow-hidden border-t border-outline-variant/60 bg-surface-container-lowest/90 backdrop-blur-sm">
      <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-16 md:px-12 md:pt-20">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="display text-3xl md:text-4xl">Aprendé con las manos en el equipo.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/cursos" className="btn-primary">Ver cursos</Link>
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className={red}><WhatsAppIcon size={20} /></a>}
              {ig && <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={red}><InstagramIcon size={20} /></a>}
            </div>
          </div>
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 md:col-span-6 md:col-start-7">
            {datos.map(({ icono: I, texto, titulo }) => (
              <div key={titulo}>
                <dt className="dato mb-2 flex items-center gap-2"><I size={15} aria-hidden className="text-accent" /> {titulo}</dt>
                <dd className="text-on-surface">{texto}</dd>
              </div>
            ))}
            {c.email && (
              <div>
                <dt className="dato mb-2 flex items-center gap-2"><Mail size={15} aria-hidden className="text-accent" /> Email</dt>
                <dd><a href={`mailto:${c.email}`} className="break-all text-on-surface underline-offset-4 hover:underline">{c.email}</a></dd>
              </div>
            )}
          </dl>
        </div>

        <nav aria-label="Pie de página" className="mt-14 flex flex-wrap gap-x-6 gap-y-0 border-t border-outline-variant/60 pt-6">
          <Link href="/cursos" className={lnk}>Cursos y talleres</Link>
          {conAulas && <Link href="/aulas" className={lnk}>Aulas</Link>}{/* RF-60: igual que el menú, solo con aulas visibles */}
          <Link href="/galeria" className={lnk}>Galería</Link>
          <Link href="/preguntas-frecuentes" className={lnk}>Preguntas frecuentes</Link>
          <Link href="/contacto" className={lnk}>Contacto</Link>
          <Link href="/login" className={`${lnk} gap-1`}>Campus <ArrowUpRight size={14} aria-hidden /></Link>
        </nav>

        <Link href="/" aria-label="Recovery Parts, inicio" className="group mt-12 flex flex-col items-start gap-3 text-on-surface sm:flex-row sm:items-center sm:gap-4">
          <Image src="/images/logo.png" alt="" width={96} height={96} className="h-14 w-14 shrink-0 md:h-20 md:w-20" />
          <span aria-hidden className="display block text-[clamp(1.9rem,8.4vw,8.5rem)] leading-[0.9] transition-[font-stretch] duration-700 ease-(--ease-out) [font-stretch:100%] group-hover:[font-stretch:125%]">Recovery Parts</span>
        </Link>
        <p className="mt-6 text-sm text-on-surface-variant">© {new Date().getFullYear()} Recovery Parts · Academia de cursos y talleres presenciales · Córdoba, Argentina.</p>
      </div>
    </footer>
  )
}
