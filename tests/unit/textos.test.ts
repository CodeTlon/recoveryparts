import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TEXTOS_BASE, conTextos } from '../../src/lib/textos'

test('sin textos guardados se usan los de siempre', () => {
  assert.deepEqual(conTextos(undefined), TEXTOS_BASE)
})
test('lo guardado reemplaza campo por campo; lo vacío o desconocido se ignora', () => {
  const t = conTextos({ faq: { titulo: '  Dudas  ', bajada: '   ' }, cursos: { titulo: 'Catálogo' }, nada: { x: 'y' } } as never)
  assert.equal(t.faq.titulo, 'Dudas')
  assert.equal(t.faq.bajada, TEXTOS_BASE.faq.bajada)
  assert.equal(t.cursos.titulo, 'Catálogo')
  assert.equal(t.contacto.titulo, TEXTOS_BASE.contacto.titulo)
  assert.equal('nada' in t, false)
})
test('no modifica los valores por defecto', () => {
  conTextos({ seo: { titulo: 'Otro' } })
  assert.equal(TEXTOS_BASE.seo.titulo, 'Recovery Parts — Academia de cursos técnicos')
})
