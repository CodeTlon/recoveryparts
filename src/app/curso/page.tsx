'use client'

// ============================================================
// DEMO — Página de curso (Recovery Parts)
// Fiel al diseño Stitch "course_landing" (Industrial Technical
// Narrative): hero + chips, Plan de Estudios (acordeón) + card
// de Inversión sticky. Mock estático, sin backend.
// ============================================================

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Zap, Clock, Award, Wrench, ChevronDown, CheckCircle2, Lock,
  Headset, ArrowRight,
} from 'lucide-react'
import { demoConfig } from '@/lib/demo-config'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'

const gridBg: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, rgba(143,144,151,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(143,144,151,0.05) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
}

const MODULOS = [
  {
    n: '01',
    title: 'Fundamentos y Diagnóstico Visual',
    items: [
      'Identificación de modelos y generaciones de iPhone.',
      'Herramientas esenciales del taller técnico.',
      'Protocolos de seguridad ESD (Descarga Electrostática).',
      'Técnicas de apertura segura sin dañar flexores.',
    ],
  },
  {
    n: '02',
    title: 'Periféricos y Reemplazo Modular',
    items: [
      'Reemplazo de batería con calibración de salud.',
      'Cámaras, altavoces y módulos de carga.',
      'Diagnóstico de fallas en botones y sensores.',
      'Sellado y resistencia al agua post-reparación.',
    ],
  },
  {
    n: '03',
    title: 'Pantallas, Baterías y Truetone',
    items: [
      'Cambio de glass y OLED sin perder Truetone.',
      'Transferencia de IC de pantalla.',
      'Programación de baterías y mensajes de software.',
      'Control de calidad y pruebas de táctil.',
    ],
  },
  {
    n: '04',
    title: 'Introducción a Microelectrónica',
    items: [
      'Lectura de esquemáticos y diagramas de placa.',
      'Microsoldadura: estaño, flux y aire caliente.',
      'Reballing y reemplazo de chips BGA.',
      'Reparación de líneas de alimentación y cortos.',
    ],
  },
]

const CHIPS = [
  { icon: Clock, label: '8 a 12 clases' },
  { icon: Award, label: 'Certificado' },
  { icon: Wrench, label: '100% Práctico' },
]

export default function CursoDemo() {
  const [open, setOpen] = useState(0)
  const wa = `https://wa.me/${demoConfig.business.whatsapp}?text=${encodeURIComponent('Hola, quiero info del curso de Reparación de iPhone')}`

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface" style={gridBg}>
      <SiteNav />

      <main className="flex-grow w-full max-w-[1280px] mx-auto px-4 md:px-12 pt-28 pb-12 md:pb-20">
        {/* Hero */}
        <section className="mb-20 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="bg-surface-container-high border border-outline/30 px-3 py-1 rounded text-primary text-xs font-medium uppercase tracking-wider">Técnico Nivel 1</span>
              <span className="border border-secondary px-3 py-1 rounded text-secondary text-xs font-medium uppercase tracking-wider flex items-center gap-1" style={{ backgroundColor: 'rgba(184,57,0,0.2)' }}>
                <Zap size={14} /> Cupos Limitados
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface">Reparación de iPhone</h1>
            <p className="text-lg text-on-surface-variant max-w-2xl border-l-2 border-outline pl-4 leading-relaxed">
              Dominá la arquitectura interna y reparación de dispositivos Apple. Una capacitación intensiva diseñada para formar técnicos especializados con estándares industriales.
            </p>
            <div className="flex flex-wrap gap-4 mt-2">
              {CHIPS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 bg-surface-container px-4 py-2 border border-outline/20 rounded text-sm font-semibold">
                  <Icon size={18} className="text-primary" /> {label}
                </div>
              ))}
            </div>
          </div>

          {/* Imagen técnica con overlays industriales */}
          <div className="lg:col-span-5 relative h-64 lg:h-[400px] border border-outline/30 rounded overflow-hidden">
            <Image
              src="/images/curso-iphone.jpg"
              alt="Reparación de iPhone — taller técnico"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface/60 to-transparent" />
          </div>
        </section>

        {/* Plan de estudios + Inversión */}
        <div id="plan" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Acordeón */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <div className="flex flex-col gap-3 border-b border-outline-variant pb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-semibold text-on-surface">Plan de Estudios</h2>
                <span className="bg-surface-container px-3 py-1 border border-outline/20 rounded text-xs font-medium text-on-surface-variant">4 Módulos Técnicos</span>
              </div>
              <p className="text-sm text-on-surface-variant">Cursada de 8 a 12 clases, una por semana, según el ritmo del grupo. Si el plan no se completa en 12 clases, sumás las que falten <span className="text-primary font-semibold">sin costo adicional</span>.</p>
            </div>
            <div className="flex flex-col gap-4">
              {MODULOS.map((m, i) => {
                const isOpen = open === i
                return (
                  <div key={m.n} className="bg-surface-container-low border border-outline/30 rounded overflow-hidden">
                    <button
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                      className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-surface-container transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-accent font-mono text-xl font-bold">{m.n}</span>
                        <h3 className="text-lg md:text-xl font-semibold text-on-surface">{m.title}</h3>
                      </div>
                      <ChevronDown size={22} className={`text-on-surface-variant transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <ul className="px-6 pb-6 pt-2 border-t border-outline/10 flex flex-col">
                        {m.items.map((it) => (
                          <li key={it} className="flex items-start gap-3 py-2 border-b border-outline/10 last:border-0 text-on-surface-variant">
                            <CheckCircle2 size={18} className="text-primary mt-0.5 shrink-0" /> <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar Inversión */}
          <div className="lg:col-span-4 relative">
            <div className="lg:sticky lg:top-[100px] flex flex-col gap-6">
              <div className="bg-surface-container border border-outline-variant rounded p-6 flex flex-col gap-6 shadow-lg shadow-black/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-semibold text-on-surface">Inversión</h3>
                    <p className="text-xs text-on-surface-variant mt-1 uppercase tracking-wider">Acceso Completo</p>
                  </div>
                  <span className="bg-primary-container text-primary text-xs font-semibold px-2 py-1 rounded border border-primary/30">SIN INTERÉS</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-bold text-on-surface">$25.000</span>
                    <span className="text-on-surface-variant">inscripción</span>
                  </div>
                  <span className="text-sm text-on-surface-variant">+ 3 cuotas de $65.000 sin interés</span>
                </div>
                <div className="h-px w-full bg-outline/20" />
                <div>
                  <h4 className="text-sm font-semibold text-on-surface mb-3">Métodos de Pago</h4>
                  <div className="flex gap-3 items-center flex-wrap opacity-70">
                    {['VISA', 'MASTERCARD'].map((c) => (
                      <span key={c} className="border border-outline/30 px-3 py-1.5 rounded bg-surface font-mono text-xs text-on-surface-variant">{c}</span>
                    ))}
                    <span className="border border-outline/30 px-3 py-1.5 rounded bg-surface font-mono text-xs" style={{ color: '#ff5900' }}>NARANJA</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-3 flex items-center gap-1">
                    <Lock size={14} /> Pago 100% Seguro
                  </p>
                </div>
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="mt-2 w-full bg-accent hover:opacity-90 text-white font-bold uppercase tracking-wider py-4 rounded text-center transition-opacity flex justify-center items-center gap-2 group">
                  Inscribite Ahora
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              <div className="bg-surface-container-low border border-outline/20 rounded p-4 flex items-start gap-4">
                <Headset size={26} className="text-primary shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-on-surface">¿Dudas Técnicas?</h4>
                  <p className="text-xs text-on-surface-variant mt-1">Hablá con un asesor por WhatsApp para evaluar tu perfil.</p>
                </div>
              </div>

              <Link href="/login" className="text-center text-sm text-on-surface-variant hover:text-secondary transition-colors">
                ← Volver al campus
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
