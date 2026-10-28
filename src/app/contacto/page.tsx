import type { Metadata } from 'next'
import { metaPagina } from '@/lib/seo'
import Link from 'next/link'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina'
import ContactForm from '@/components/public/ContactForm'
import { WhatsAppIcon, InstagramIcon } from '@/components/layout/SocialIcons'
import { getSettings, waLink } from '@/lib/data'

export const metadata: Metadata = metaPagina({ titulo: 'Contacto', descripcion: 'Escribinos o visitanos: dirección, horarios y formulario de consulta.', ruta: '/contacto' })
export const dynamic = 'force-dynamic'

export default async function ContactoPage() {
  const { contacto: c } = await getSettings()
  const fila = 'flex min-w-0 items-start gap-3 border-b border-outline-variant/60 pb-4 text-on-surface'
  return (
    <div className="flex min-h-screen flex-col text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="grow outline-hidden">
        <EncabezadoPagina titulo="Contacto" bajada="Escribinos con tu consulta o pasá por la academia. Te respondemos por mail." />
        <section className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-4 py-14 md:px-12 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <aside className="space-y-6">
            <h2 className="display text-3xl [font-stretch:108%]">Dónde estamos</h2>
            <ul className="space-y-4">
              {c.direccion && <li className={fila}><MapPin size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden /> <span>{c.direccion}</span></li>}
              {c.horario && <li className={fila}><Clock size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden /> <span>{c.horario}</span></li>}
              {c.telefono && <li className={fila}><Phone size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden /> <span>{c.telefono}</span></li>}
              {c.email && <li className={fila}><Mail size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden /> <a className="min-w-0 wrap-break-word hover:text-secondary" href={`mailto:${c.email}`}>{c.email}</a></li>}
              {c.instagram && <li className={fila}><InstagramIcon size={20} className="mt-0.5 shrink-0 text-accent" /> <a className="hover:text-secondary" href={`https://www.instagram.com/${c.instagram.replace('@', '')}/`} target="_blank" rel="noopener noreferrer">{c.instagram}</a></li>}
            </ul>
            {c.whatsapp && (
              <a href={waLink(c.whatsapp, 'Hola! Quería hacer una consulta.')} target="_blank" rel="noopener noreferrer" className="btn-outline">
                <WhatsAppIcon size={18} /> Consultar por WhatsApp
              </a>
            )}
            <p className="text-sm text-on-surface-variant">¿Dudas comunes? Mirá las <Link href="/preguntas-frecuentes" className="text-secondary underline-offset-4 hover:underline">preguntas frecuentes</Link>.</p>
          </aside>
          <div className="card p-6 md:p-8">
            <h2 className="display mb-6 text-3xl [font-stretch:108%]">Escribinos</h2>
            <ContactForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
