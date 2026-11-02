import { test } from 'node:test'
import assert from 'node:assert/strict'
import { videoSeguro } from '../../src/lib/validar'

// El video de la portada se sube al sitio (/media/…) o se pega como link: los dos se tienen que ver.
test('videoSeguro acepta un video subido al sitio y un link http(s)', () => {
  assert.equal(videoSeguro('/media/8341155e-f0a1-4d7f-b412-d9f8bc27561d.webm'), '/media/8341155e-f0a1-4d7f-b412-d9f8bc27561d.webm')
  assert.equal(videoSeguro('https://ejemplo.com/v.mp4'), 'https://ejemplo.com/v.mp4')
})

test('videoSeguro descarta rutas peligrosas o vacías', () => {
  for (const v of [null, undefined, '', 'javascript:alert(1)', '//otro.com/v.mp4', '/media/../secreto', 'media/v.mp4']) assert.equal(videoSeguro(v), undefined)
})
