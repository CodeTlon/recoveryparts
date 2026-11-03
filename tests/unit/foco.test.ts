import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conFoco, estiloFoco, leerFoco, sinFoco } from '../../src/lib/foco'
import { imagenOpcional } from '../../src/lib/validar'

test('el encuadre viaja en el fragmento de la URL y se lee igual', () => {
  const u = conFoco('/media/a.webp', { x: 30.4, y: 70, zoom: 1.456 })
  assert.equal(u, '/media/a.webp#foco=30,70,1.46')
  assert.deepEqual(leerFoco(u), { x: 30, y: 70, zoom: 1.46 })
  assert.equal(sinFoco(u), '/media/a.webp')
  assert.equal(conFoco(u, { x: 50, y: 50, zoom: 1 }), '/media/a.webp') // centro sin zoom = URL limpia
  assert.equal(conFoco('/media/a.webp', { x: 120, y: -5, zoom: 9 }), '/media/a.webp#foco=100,0,3')
})

test('el estilo solo aparece si hay encuadre', () => {
  assert.equal(estiloFoco('/media/a.webp'), undefined)
  assert.deepEqual(estiloFoco('/media/a.webp#foco=20,80'), { objectPosition: '20% 80%' })
  assert.deepEqual(estiloFoco('/media/a.webp#foco=20,80,2'), { objectPosition: '20% 80%', transform: 'scale(2)', transformOrigin: '20% 80%' })
})

test('el servidor acepta el encuadre y nada más después de la ruta', () => {
  for (const ok of ['/media/a.webp', '/media/a.webp#foco=0,100', '/media/a.webp#foco=30,70,1.46', '/media/a.webp#foco=50,50,3'])
    assert.equal(imagenOpcional(ok), ok)
  for (const mal of ['/media/a.webp#foco=101,0', '/media/a.webp#foco=1,2,3.5', '/media/a.webp#x', '/media/a.webp#foco=1,2#foco=1,2', '//evil.com/a.webp#foco=1,2', '/media/../a#foco=1,2', '/media/a.webp#foco=1,2,<script>'])
    assert.equal(imagenOpcional(mal), undefined, mal)
})
