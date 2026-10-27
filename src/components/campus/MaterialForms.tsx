import { ActionForm, Check, Field, FileField, Select } from '@/components/campus/ui'
import { agregarLink, subirPdf } from '@/app/campus/profesor/actions'
import { TIPO_CLASE, type ArbolClase, type ArbolModulo } from '@/components/campus/ArbolEstructura'
import { MAX_SUBIDA } from '@/lib/media'

// Formularios para cargar material (RF-05, RF-36): PDF o link, asociado a una clase o «general».
// Con `edicionId` (profesor) el material es de esa edición y se puede liberar en el momento; sin él (admin) es
// material base del curso, sobre las clases de la guía general.
export default function MaterialForms({ cursoId, edicionId, modulos, clases }: {
  cursoId: string; edicionId?: string; modulos: ArbolModulo[]; clases: ArbolClase[]
}) {
  // Selector de clase agrupado por módulo (en talleres, sin grupos).
  const opcion = (p: ArbolClase): [string, string] => [p.id, `${p.numero}. ${p.titulo} · ${TIPO_CLASE[p.tipo]}`]
  const claseOpts: [string, string][] = clases.filter((p) => !modulos.some((m) => m.id === p.modulo_id)).map(opcion)
  const claseGrupos: [string, [string, string][]][] = modulos.map((m, i) => [`Módulo ${i + 1} · ${m.titulo}`, clases.filter((p) => p.modulo_id === m.id).map(opcion)])
  const comunes = (
    <>
      <input type="hidden" name="curso_id" value={cursoId} />
      {edicionId && <input type="hidden" name="edicion_id" value={edicionId} />}
    </>
  )
  const clase = <Select name="plan_clase_id" label="Clase" empty="Material general (sin clase)" options={claseOpts} grupos={claseGrupos} />
  const liberar = edicionId && <Check name="liberar_ya">Liberarlo ya para mis alumnos</Check>
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <h3 className="mb-4 font-semibold">Subir PDF</h3>
        <ActionForm action={subirPdf} submit="Subir PDF">
          {comunes}
          <Field label="Título" name="titulo" placeholder="Ej: Apunte de la clase 1" required />
          <FileField label="Archivo (PDF, máx. 25 MB)" name="archivo" accept="application/pdf" required maxBytes={MAX_SUBIDA} />
          {clase}
          {liberar}
        </ActionForm>
      </div>
      <div className="card p-6">
        <h3 className="mb-4 font-semibold">Agregar link (video, Drive…)</h3>
        <ActionForm action={agregarLink} submit="Agregar link">
          {comunes}
          <Field label="Título" name="titulo" placeholder="Ej: Video de la clase 1" required />
          <Field label="Link" name="url" type="url" required placeholder="https://" hint="Subí los videos a YouTube (no listado) o Drive. No se alojan videos." />
          {clase}
          {liberar}
        </ActionForm>
      </div>
    </div>
  )
}
