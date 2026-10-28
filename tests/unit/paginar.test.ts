import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hrefPagina, paginaDe, paginar, paginasVisibles } from '../../src/lib/paginar'

const diecinueve = Array.from({ length: 19 }, (_, i) => i + 1)

test('un parámetro raro o ausente es la página 1', () => {
  for (const v of [undefined, '', '0', '-2', '1.5', 'abc', '99999']) assert.equal(paginaDe(v), 1)
  assert.equal(paginaDe('3'), 3)
})
test('corta la página pedida e informa el rango para «Mostrando X–Y de Z»', () => {
  const r = paginar(diecinueve, '2', 12)
  assert.deepEqual(r.items, [13, 14, 15, 16, 17, 18, 19])
  assert.deepEqual([r.pagina, r.totalPaginas, r.desde, r.hasta, r.total], [2, 2, 13, 19, 19])
})
test('una página que no existe se corrige a la última (nunca una página vacía)', () => {
  const r = paginar(diecinueve, '9', 12)
  assert.equal(r.pagina, 2)
  assert.equal(r.items.length, 7)
})
test('una lista vacía es una sola página sin ítems', () => {
  assert.deepEqual(paginar([], '4', 12), { pagina: 1, totalPaginas: 1, items: [], desde: 0, hasta: 0, total: 0 })
})
test('el link conserva los filtros, no escribe la página 1 y descarta vacíos', () => {
  assert.equal(hrefPagina('/cursos', { area: 'tecnico', q: '', pagina: '3' }, 2, 'resultados'), '/cursos?area=tecnico&pagina=2#resultados')
  assert.equal(hrefPagina('/cursos', { area: 'tecnico' }, 1), '/cursos?area=tecnico')
  assert.equal(hrefPagina('/galeria', {}, 1), '/galeria')
})
test('números visibles: primera, última y vecinas de la actual con «…» en los saltos', () => {
  assert.deepEqual(paginasVisibles(1, 1), [1])
  assert.deepEqual(paginasVisibles(1, 3), [1, 2, 3])
  assert.deepEqual(paginasVisibles(6, 12), [1, '…', 5, 6, 7, '…', 12])
  assert.deepEqual(paginasVisibles(12, 12), [1, '…', 11, 12])
})
