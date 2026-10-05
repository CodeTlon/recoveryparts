import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { getSettings, waLink } from '@/lib/data'
import { WhatsAppIcon, InstagramIcon } from './SocialIcons'

export default async function SiteFooter() {
  const { contacto: c } = await getSettings()
  const wa = waLink(c.whatsapp)
  const ig = c.instagram?.replace('@', '')
  const item = 'flex items-start gap-2 text-on-surface-variant'
  const lnk = 'text-sm text-on-surface-variant transition-colors hover:text-primary md:text-base'

  return (
    <footer className="w-full border-t border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-6 gap-y-8 px-4 py-12 md:grid-cols-12 md:gap-y-10 md:px-12 md:py-16">
        <div className="col-span-2 flex flex-col gap-4 md:col-span-5">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold uppercase tracking-tighter text-on-surface">
            <Image src="/images/logo.png" alt="" width={36} height={36} className="h-9 w-9" />
            Recovery Parts
          </Link>
          <p className="max-w-xs text-on-surface-variant">Academia de cursos y talleres técnicos en Córdoba.</p>
          <div className="mt-1 flex items-center gap-3">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition-colors hover:border-secondary hover:text-white"><WhatsAppIcon size={20} /></a>}
            {ig && <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded border border-outline-variant text-on-surface-variant transition-colors hover:border-secondary hover:text-white"><InstagramIcon size={20} /></a>}
          </div>
        </div>

        <div className="col-span-2 flex flex-col gap-3 md:col-span-3">
          <span className="mb-1 text-xs uppercase tracking-widest text-on-surface-variant">Navegación</span>
          <Link href="/cursos" className={lnk}>Cursos y talleres</Link>
          <Link href="/galeria" className={lnk}>Galería</Link>
          <Link href="/preguntas-frecuentes" className={lnk}>Preguntas frecuentes</Link>
          <Link href="/contacto" className={lnk}>Contacto</Link>
          <Link href="/login" className={lnk}>Campus</Link>
        </div>

        <div className="col-span-2 flex flex-col gap-3 md:col-span-4">
          <span className="mb-1 text-xs uppercase tracking-widest text-on-surface-variant">Contacto</span>
          {c.telefono && <span className={item}><Phone size={16} className="mt-0.5 shrink-0" /> {c.telefono}</span>}
          {c.email && <a href={`mailto:${c.email}`} className={`${item} hover:text-primary`}><Mail size={16} className="mt-0.5 shrink-0" /> {c.email}</a>}
          {c.direccion && <span className={item}><MapPin size={16} className="mt-0.5 shrink-0" /> {c.direccion}</span>}
          {c.horario && <span className={item}><Clock size={16} className="mt-0.5 shrink-0" /> {c.horario}</span>}
        </div>

        <div className="col-span-2 mt-2 border-t border-outline-variant/40 pt-6 text-center text-sm text-on-surface-variant md:col-span-12 md:mt-4 md:pt-8 md:text-left">
          © {new Date().getFullYear()} Recovery Parts · Córdoba, Argentina. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  )
}
