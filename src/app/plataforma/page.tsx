'use client'

// ============================================================
// DEMO — Campus / Dashboard (Recovery Parts)
// Fiel al diseño Stitch "student_dashboard" (sidebar + cards
// industriales). 3 roles en el mismo shell: admin / profesor /
// alumno. Mock estático, sin backend ni auth real.
// ============================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Wrench, HardHat, BadgeCheck, LifeBuoy, Settings, LogOut,
  Play, ClipboardList, FileText, Download, ArrowRight,
  Plus, Users, BookOpen, GraduationCap, DollarSign, CalendarClock,
  Menu, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { USERS, userByRole, type Role } from '@/lib/demo-users'

type IconType = typeof Users

const NAV: Record<Role, { title: string; sub: string; cta: string; links: [string, IconType][] }> = {
  alumno:   { title: 'Portal del Alumno', sub: 'Trayecto Técnico', cta: 'Abrir Taller',
    links: [['Inicio', LayoutDashboard], ['Mis Módulos', Wrench], ['Bitácora de Taller', HardHat], ['Certificaciones', BadgeCheck], ['Soporte', LifeBuoy]] },
  profesor: { title: 'Panel Docente', sub: 'Instructor', cta: 'Nueva Clase',
    links: [['Inicio', LayoutDashboard], ['Mis Cursos', BookOpen], ['Alumnos', Users], ['Calificaciones', ClipboardList], ['Soporte', LifeBuoy]] },
  admin:    { title: 'Panel Admin', sub: 'Gestión', cta: 'Crear Curso',
    links: [['Inicio', LayoutDashboard], ['Cursos', BookOpen], ['Alumnos', Users], ['Profesores', GraduationCap], ['Finanzas', DollarSign]] },
}

const btnPrimary = 'bg-accent hover:opacity-90 text-white font-semibold text-sm uppercase tracking-wide py-3 px-6 rounded transition-opacity flex items-center justify-center gap-2'
const btnOutline = 'bg-transparent border-2 border-accent text-accent hover:bg-surface-container font-semibold text-sm uppercase tracking-wide py-3 px-6 rounded transition-colors flex items-center justify-center gap-2'
const card = 'bg-surface-container-low border border-outline-variant rounded-lg'

// ── Contenido del sidebar (reutilizado en desktop y en el drawer mobile) ──
function SidebarInner({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const nav = NAV[role]
  const u = userByRole(role)
  return (
    <>
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary font-bold shrink-0">
          {u.name.split(' ').map((s) => s[0]).join('').slice(0, 2)}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-primary leading-tight">{nav.title}</h2>
          <p className="text-xs text-on-surface-variant">{nav.sub}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        {nav.links.map(([label, Icon], i) => (
          <a key={label} href="#" onClick={onNavigate}
            className={`flex items-center gap-4 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
              i === 0 ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-highest'
            }`}>
            <Icon size={20} /> {label}
          </a>
        ))}
      </div>

      <button onClick={onNavigate} className={`${btnPrimary} w-full my-4`}>{nav.cta}</button>

      <div className="flex flex-col gap-1 border-t border-outline-variant pt-3">
        <a href="#" onClick={onNavigate} className="flex items-center gap-4 rounded-lg px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors"><Settings size={20} /> Configuración</a>
        <Link href="/login" className="flex items-center gap-4 rounded-lg px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-highest transition-colors"><LogOut size={20} /> Cerrar sesión</Link>
      </div>
    </>
  )
}

// ── Sidebar fijo (desktop) ─────────────────────────────────
function Sidebar({ role }: { role: Role }) {
  return (
    <nav className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-outline-variant p-4 z-50">
      <SidebarInner role={role} />
    </nav>
  )
}

// ── Navegación mobile: top-bar sticky + drawer ─────────────
function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const nav = NAV[role]
  const u = userByRole(role)

  return (
    <div className="md:hidden">
      {/* Top-bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-surface-container border-b border-outline-variant px-4 h-16">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary text-sm font-bold shrink-0">
            {u.name.split(' ').map((s) => s[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary leading-tight truncate">{nav.title}</p>
            <p className="text-[11px] text-on-surface-variant truncate">{nav.sub}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="inline-flex items-center justify-center w-11 h-11 -mr-1.5 rounded text-on-surface hover:text-secondary transition-colors shrink-0"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 top-0 h-full w-72 max-w-[85vw] flex flex-col bg-surface-container border-r border-outline-variant p-4 overflow-y-auto">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="self-end inline-flex items-center justify-center w-11 h-11 -mr-1.5 -mt-1 rounded text-on-surface hover:text-secondary transition-colors"
            >
              <X size={24} />
            </button>
            <SidebarInner role={role} onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}
    </div>
  )
}

function SectionHead({ title, badge, action }: { title: string; badge?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl md:text-2xl font-semibold text-on-surface">{title}</h2>
        {badge && <span className="text-xs font-semibold bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded uppercase tracking-wider">{badge}</span>}
      </div>
      {action}
    </div>
  )
}

// ── Paginación reutilizable (10 por página) ────────────────
function Pagination({ page, totalPages, start, pageSize, total, onPage, label }: {
  page: number; totalPages: number; start: number; pageSize: number; total: number;
  onPage: (p: number) => void; label: string
}) {
  if (totalPages <= 1) return null
  const btn = 'inline-flex items-center gap-1 px-3 py-2 rounded border border-outline-variant text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:border-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none'
  return (
    <nav className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3" aria-label={label}>
      <span className="text-xs text-on-surface-variant order-2 sm:order-1">
        Mostrando {start + 1}–{Math.min(start + pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className={btn}>
          <ChevronLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
        </button>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPage(i + 1)}
            aria-current={page === i + 1 ? 'page' : undefined}
            className={`w-9 h-9 rounded border text-xs font-semibold transition-colors ${
              page === i + 1
                ? 'bg-accent text-white border-accent'
                : 'border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-secondary'
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button type="button" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={btn}>
          <span className="hidden sm:inline">Siguiente</span> <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}

// ── Vistas por rol ─────────────────────────────────────────
function AlumnoMain() {
  const materiales = [
    { icon: FileText, size: '2.4 MB', title: 'Apunte teórico — Módulo 4', desc: 'PDF de microelectrónica: esquemáticos y líneas de alimentación.' },
    { icon: FileText, size: '1.8 MB', title: 'Esquemáticos de Placa', desc: 'Planos de circuitería del iPhone 13 Pro Max (PDF).' },
    { icon: FileText, size: '3.1 MB', title: 'Guía de diagnóstico', desc: 'Protocolos de medición y tabla de fallas frecuentes (PDF).' },
  ]
  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-2 tracking-tight">Resumen Técnico</h1>
        <p className="text-lg text-on-surface-variant">Seguí tu progreso y accedé al material del taller.</p>
      </header>

      <section className="mb-16">
        <SectionHead title="Módulo Activo" badge="MOD-04" />
        <div className={`${card} p-6 md:p-8 relative overflow-hidden`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-primary mb-2">Reparación de iPhone</h3>
                <p className="text-on-surface-variant max-w-2xl">Diagnóstico y reparación a nivel componente para dispositivos iOS modernos.</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-on-surface-variant uppercase tracking-wider">Completado</span>
                  <span className="text-2xl font-semibold text-secondary">50%</span>
                </div>
                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: '50%' }} />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <button className={btnPrimary}><FileText size={18} /> Ver apuntes (PDF)</button>
              <button className={btnOutline}><ClipboardList size={18} /> Evaluación final</button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHead title="Material de Estudio" action={
          <Link href="/curso" className="text-sm font-semibold text-secondary hover:text-primary transition-colors flex items-center gap-1">Ver curso <ArrowRight size={16} /></Link>
        } />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materiales.map(({ icon: Icon, size, title, desc }) => (
            <div key={title} className={`${card} p-6 flex flex-col hover:border-secondary transition-colors group`}>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-surface-container-high rounded-lg text-primary group-hover:text-secondary transition-colors"><Icon size={28} /></div>
                <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">{size}</span>
              </div>
              <h3 className="text-xl font-semibold text-on-surface mb-2">{title}</h3>
              <p className="text-on-surface-variant mb-6 flex-1">{desc}</p>
              <button className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-secondary transition-colors border-t border-outline-variant pt-4"><Download size={18} /> Descargar</button>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function ProfesorMain() {
  const cursos = [
    { nombre: 'Reparación de iPhone', clase: '7 de 12', alumnos: 12, prog: 58 },
    { nombre: 'Reparación de PC', clase: '4 de 16', alumnos: 14, prog: 25 },
  ]
  const alumnos = [
    { nombre: 'Lucas Díaz', asistencia: '7/8', evaluacion: 'Pendiente' },
    { nombre: 'Mariana Soto', asistencia: '8/8', evaluacion: 'Pendiente' },
    { nombre: 'Joaquín Vera', asistencia: '6/8', evaluacion: 'Pendiente' },
    { nombre: 'Camila Ruiz', asistencia: '8/8', evaluacion: 'Pendiente' },
    { nombre: 'Bruno Acosta', asistencia: '5/8', evaluacion: 'Pendiente' },
    { nombre: 'Sofía Ledesma', asistencia: '8/8', evaluacion: 'Pendiente' },
    { nombre: 'Martín Quiroga', asistencia: '7/8', evaluacion: 'Aprobado' },
    { nombre: 'Valentina Ríos', asistencia: '6/8', evaluacion: 'Pendiente' },
    { nombre: 'Nicolás Herrera', asistencia: '8/8', evaluacion: 'Aprobado' },
    { nombre: 'Julieta Moreno', asistencia: '5/8', evaluacion: 'Pendiente' },
    { nombre: 'Federico Sosa', asistencia: '7/8', evaluacion: 'Pendiente' },
    { nombre: 'Agustina Ferreyra', asistencia: '8/8', evaluacion: 'Aprobado' },
    { nombre: 'Tomás Villalba', asistencia: '6/8', evaluacion: 'Pendiente' },
  ]
  const pageSize = 10
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(alumnos.length / pageSize)
  const start = (page - 1) * pageSize
  const visibles = alumnos.slice(start, start + pageSize)
  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-2 tracking-tight">Panel del Profesor</h1>
        <p className="text-lg text-on-surface-variant">Gestioná tus cursos, la asistencia y la evaluación final de tus alumnos.</p>
      </header>

      <section className="mb-16">
        <SectionHead title="Próxima clase" badge="HOY 18:00" />
        <div className={`${card} p-6 flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <CalendarClock size={22} className="text-accent" />
            <span className="font-semibold text-on-surface">Reparación de iPhone · Microsoldadura básica · Taller A</span>
          </div>
          <button className={btnPrimary}><Play size={18} /> Iniciar clase</button>
        </div>
      </section>

      <section className="mb-16">
        <SectionHead title="Mis Cursos" />
        <div className="grid sm:grid-cols-2 gap-6">
          {cursos.map((c) => (
            <div key={c.nombre} className={`${card} p-6`}>
              <div className="font-semibold text-on-surface mb-1">{c.nombre}</div>
              <div className="text-sm text-on-surface-variant mb-4">Clase {c.clase} · {c.alumnos} alumnos</div>
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${c.prog}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHead title="Alumnos — Reparación de iPhone" action={<button className={btnPrimary}><ClipboardList size={16} /> Tomar asistencia</button>} />
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Alumno</th>
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Asistencia</th>
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Eval. final</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => (
                <tr key={a.nombre} className="border-t border-outline-variant text-on-surface">
                  <td className="px-4 py-3 md:px-6 md:py-4 font-medium">{a.nombre}</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-on-surface-variant">{a.asistencia}</td>
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${a.evaluacion === 'Aprobado' ? 'bg-accent text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>{a.evaluacion}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} start={start} pageSize={pageSize} total={alumnos.length} onPage={setPage} label="Paginación de alumnos" />
      </section>
    </>
  )
}

function AdminMain() {
  const kpis: [IconType, string, string][] = [
    [BookOpen, '8', 'Cursos activos'],
    [Users, '142', 'Alumnos'],
    [GraduationCap, '5', 'Profesores'],
    [DollarSign, '$1.2M', 'Ingresos del mes'],
  ]
  const cursos = [
    { nombre: 'Reparación de iPhone', profesor: 'Diego Ramírez', alumnos: 12, cupo: 14, estado: 'En curso' },
    { nombre: 'Reparación de PC', profesor: 'Diego Ramírez', alumnos: 14, cupo: 14, estado: 'En curso' },
    { nombre: 'Cambio de Glass', profesor: 'Sofía Pérez', alumnos: 8, cupo: 10, estado: 'Inscripción' },
    { nombre: 'Carteles Neón LED', profesor: 'Maxi Escaroni', alumnos: 6, cupo: 8, estado: 'En curso' },
    { nombre: 'Estampado y Sublimación', profesor: 'Sofía Pérez', alumnos: 9, cupo: 12, estado: 'Inscripción' },
    { nombre: 'Reparación de Android', profesor: 'Diego Ramírez', alumnos: 11, cupo: 14, estado: 'En curso' },
    { nombre: 'Reparación de Notebooks', profesor: 'Sofía Pérez', alumnos: 10, cupo: 12, estado: 'En curso' },
    { nombre: 'Reparación de TV', profesor: 'Maxi Escaroni', alumnos: 7, cupo: 10, estado: 'Inscripción' },
    { nombre: 'Microsoldadura Avanzada', profesor: 'Diego Ramírez', alumnos: 8, cupo: 8, estado: 'En curso' },
    { nombre: 'Diagnóstico de Placas', profesor: 'Sofía Pérez', alumnos: 5, cupo: 10, estado: 'Inscripción' },
    { nombre: 'Fuentes y Cargadores', profesor: 'Maxi Escaroni', alumnos: 6, cupo: 12, estado: 'Inscripción' },
    { nombre: 'Soldadura BGA / Reballing', profesor: 'Diego Ramírez', alumnos: 9, cupo: 10, estado: 'En curso' },
    { nombre: 'Impresión 3D para Repuestos', profesor: 'Sofía Pérez', alumnos: 4, cupo: 8, estado: 'Inscripción' },
  ]
  const pageSize = 10
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(cursos.length / pageSize)
  const start = (page - 1) * pageSize
  const visibles = cursos.slice(start, start + pageSize)
  return (
    <>
      <header className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold text-primary mb-2 tracking-tight">Panel de Administración</h1>
        <p className="text-lg text-on-surface-variant">Vista general de la academia.</p>
      </header>

      <section className="mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map(([Icon, value, label]) => (
            <div key={label} className={`${card} p-6`}>
              <Icon size={22} className="text-accent" />
              <div className="text-3xl font-bold text-on-surface mt-3">{value}</div>
              <div className="text-xs text-on-surface-variant uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHead title="Cursos" action={<button className={btnPrimary}><Plus size={16} /> Crear curso</button>} />
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant uppercase text-xs tracking-wider">
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Curso</th>
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Profesor</th>
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Inscriptos</th>
                <th className="font-semibold px-4 py-3 md:px-6 md:py-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.nombre} className="border-t border-outline-variant text-on-surface">
                  <td className="px-4 py-3 md:px-6 md:py-4 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-on-surface-variant">{c.profesor}</td>
                  <td className="px-4 py-3 md:px-6 md:py-4 text-on-surface-variant">{c.alumnos}/{c.cupo}</td>
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${c.estado === 'En curso' ? 'bg-accent text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>{c.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} start={start} pageSize={pageSize} total={cursos.length} onPage={setPage} label="Paginación de cursos" />
      </section>
    </>
  )
}

// ── Página ─────────────────────────────────────────────────
export default function PlataformaDemo() {
  const [role, setRole] = useState<Role>('alumno')

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('role')
    if (r === 'admin' || r === 'profesor' || r === 'alumno') setRole(r)
  }, [])

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Sidebar role={role} />
      <MobileNav role={role} />

      <main className="md:ml-64 min-h-screen p-4 md:p-12">
        {/* Switcher de demo (no existe en el producto final) */}
        <div className="max-w-[1280px] mx-auto mb-8 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant mr-1">Vista demo:</span>
          {USERS.map((u) => {
            const on = u.role === role
            return (
              <button key={u.role} onClick={() => setRole(u.role)} aria-pressed={on}
                className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
                  on ? 'bg-accent text-white border-accent' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
                }`}>
                {u.label}
              </button>
            )
          })}
          <span className="ml-auto text-xs text-on-surface-variant">Sesión de <span className="text-on-surface font-semibold">{userByRole(role).name}</span></span>
        </div>

        <div className="max-w-[1280px] mx-auto">
          {role === 'alumno' && <AlumnoMain />}
          {role === 'profesor' && <ProfesorMain />}
          {role === 'admin' && <AdminMain />}
        </div>
      </main>
    </div>
  )
}
