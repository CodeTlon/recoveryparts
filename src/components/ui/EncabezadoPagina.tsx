import TituloExpandido from './TituloExpandido'

// Encabezado común de las páginas interiores del sitio (cursos, aulas, galería, preguntas, contacto): título expandido,
// bajada y, opcionalmente, algo debajo (buscador, filtros). El fondo de circuito lo pone SiteNav para todo el sitio.
export default function EncabezadoPagina({ titulo, bajada, children }: { titulo: string; bajada?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="border-b border-outline-variant/60">
      <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-32 md:px-12 md:pb-16 md:pt-40">
        <TituloExpandido texto={titulo} className="max-w-4xl text-[clamp(2.4rem,6vw,4.75rem)]" />
        {bajada && <p className="mt-6 max-w-2xl text-lg text-on-surface-variant">{bajada}</p>}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  )
}
