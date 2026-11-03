import { test } from 'node:test'
import assert from 'node:assert/strict'
import { duracionTexto, semanasDeClases } from '../../src/lib/fechas'

test('la duración se muestra en clases, con horas y frecuencia si están', () => {
  assert.equal(duracionTexto({ cantidad_clases: 12, horas_por_clase: '2.0', frecuencia: 'semanal' }), '12 clases de 2 h · 1 vez por semana')
  assert.equal(duracionTexto({ cantidad_clases: 1, horas_por_clase: 4, frecuencia: 'semanal' }), '1 clase de 4 h')
  assert.equal(duracionTexto({ cantidad_clases: 2, horas_por_clase: '4.0', frecuencia: 'dias_seguidos' }), '2 clases de 4 h · días seguidos')
  assert.equal(duracionTexto({ cantidad_clases: 8, horas_por_clase: '1.5' }), '8 clases de 1,5 h')
  assert.equal(duracionTexto({ cantidad_clases: 12 }), '12 clases')
})

test('sin clases cargadas sigue mostrando las semanas de antes', () => {
  assert.equal(duracionTexto({ cantidad_clases: null, duracion_semanas: 8 }), '8 semanas')
  assert.equal(duracionTexto({ duracion_semanas: 1 }), '1 semana')
  assert.equal(duracionTexto({}), null)
})

test('las semanas para el calendario salen de clases y frecuencia', () => {
  assert.equal(semanasDeClases(12, 'semanal'), 12)
  assert.equal(semanasDeClases(12, null), 12)
  assert.equal(semanasDeClases(5, '2_por_semana'), 3)
  assert.equal(semanasDeClases(2, 'dias_seguidos'), 1)
  assert.equal(semanasDeClases(1, '3_por_semana'), 1)
})
