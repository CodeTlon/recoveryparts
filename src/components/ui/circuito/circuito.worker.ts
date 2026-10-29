// Worker del fondo de circuito: recibe el canvas ya transferido (OffscreenCanvas) y corre el motor fuera del hilo
// principal. La página le reenvía el tamaño, el puntero y si tiene que animar (ver CircuitField.tsx).
import { crearMotor, type MensajeCircuito, type Motor } from './motor'

let motor: Motor | null = null

self.addEventListener('message', (e: MessageEvent<MensajeCircuito>) => {
  const m = e.data
  if (m.tipo === 'iniciar') { motor = crearMotor(m.canvas, new OffscreenCanvas(1, 1), m.opciones); return }
  if (motor) (motor[m.metodo] as (...args: unknown[]) => void)(...m.args)
})
