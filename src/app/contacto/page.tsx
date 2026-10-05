import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import ContactForm from '@/components/public/ContactForm'
import { WhatsAppIcon, InstagramIcon } from '@/components/layout/SocialIcons'
import { getSettings, waLink } from '@/lib/data'

export const metadata: Metadata = { title: 'Contacto', description: 'Escribinos o visitanos: dirección, horarios y formulario de consulta.' }
export const dynamic = 'force-dynamic'

export default async function ContactoPage() {
  const { contacto: c } = await getSettings()
  const fila = 'flex items-start gap-3 text-on-surface-variant'
  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <SiteNav />
      <main id="contenido" tabIndex={-1} className="flex-grow pt-20 outline-none">
        <section className="grid-bg border-b border-outline-variant">
          <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-12">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Contacto</h1>
            <p className="max-w-2xl text-lg text-on-surface-variant">Escribinos con tu consulta o pasá por la academia. Te respondemos por mail.</p>
          </div>
        </section>
        <section className="mx-auto grid max-w-[1280px] gap-10 px-4 py-14 md:px-12 lg:grid-cols-[1fr_1.2fr]">
          <aside className="space-y-6">
            <h2 className="text-2xl font-semibold">Dónde estamos</h2>
            <ul className="space-y-4">
              {c.direccion && <li className={fila}><MapPin size={20} className="mt-0.5 shrink-0 text-secondary" aria-hidden /> <span>{c.direccion}</span></li>}
              {c.horario && <li className={fila}><Clock size={20} className="mt-0.5 shrink-0 text-secondary" aria-hidden /> <span>{c.horario}</span></li>}
              {c.telefono && <li className={fila}><Phone size={20} className="mt-0.5 shrink-0 text-secondary" aria-hidden /> <span>{c.telefono}</span></li>}
              {c.email && <li className={fila}><Mail size={20} className="mt-0.5 shrink-0 text-secondary" aria-hidden /> <a className="hover:text-secondary" href={`mailto:${c.email}`}>{c.email}</a></li>}
              {c.instagram && <li className={fila}><InstagramIcon size={20} className="mt-0.5 shrink-0 text-secondary" /> <a className="hover:text-secondary" href={`https://www.instagram.com/${c.instagram.replace('@', '')}/`} target="_blank" rel="noopener noreferrer">{c.instagram}</a></li>}
            </ul>
            {c.whatsapp && (
              <a href={waLink(c.whatsapp, 'Hola! Quería hacer una consulta.')} target="_blank" rel="noopener noreferrer" className="btn-ghost inline-flex">
                <WhatsAppIcon size={18} /> Consultar por WhatsApp
              </a>
            )}
            <p className="text-sm text-on-surface-variant">¿Dudas comunes? Mirá las <Link href="/preguntas-frecuentes" className="text-secondary underline-offset-4 hover:underline">preguntas frecuentes</Link>.</p>
          </aside>
          <div>
            <h2 className="mb-5 text-2xl font-semibold">Escribinos</h2>
            <ContactForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
