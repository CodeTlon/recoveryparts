import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ipDeCabeceras } from '../../src/lib/ip-cabeceras'

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null })

test('toma el último valor de x-forwarded-for (el que agrega el proxy)', () => {
  assert.equal(ipDeCabeceras(h({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9, 203.0.113.7' }), undefined), '203.0.113.7')
})
test('un cliente que falsifica el primer valor no cambia la IP que se cuenta', () => {
  const real = '203.0.113.7'
  const a = ipDeCabeceras(h({ 'x-forwarded-for': `6.6.6.1, ${real}` }), undefined)
  const b = ipDeCabeceras(h({ 'x-forwarded-for': `6.6.6.2, 6.6.6.3, ${real}` }), undefined)
  assert.equal(a, b)
})
test('x-real-ip falsificado no pisa a x-forwarded-for', () => {
  assert.equal(ipDeCabeceras(h({ 'x-real-ip': '6.6.6.6', 'x-forwarded-for': '203.0.113.7' }), undefined), '203.0.113.7')
})
test('x-real-ip solo se usa si no hay x-forwarded-for', () => {
  assert.equal(ipDeCabeceras(h({ 'x-real-ip': '198.51.100.2' }), undefined), '198.51.100.2')
})
test('TRUSTED_IP_HEADER manda sobre el resto', () => {
  assert.equal(ipDeCabeceras(h({ 'cf-connecting-ip': '198.51.100.9', 'x-forwarded-for': '10.0.0.1, 172.16.0.1' }), 'cf-connecting-ip'), '198.51.100.9')
})
test('si la cabecera confiada falta, cae al último x-forwarded-for', () => {
  assert.equal(ipDeCabeceras(h({ 'x-forwarded-for': '10.0.0.1, 203.0.113.7' }), 'cf-connecting-ip'), '203.0.113.7')
})
test('sin cabeceras devuelve "local"', () => {
  assert.equal(ipDeCabeceras(h({}), undefined), 'local')
})
