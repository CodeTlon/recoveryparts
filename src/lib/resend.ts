import { Resend } from 'resend'

// El constructor de Resend tira si la key falta del todo (Bug 32 de la
// fábrica) — un placeholder evita que un build/`npm start` sin `.env`
// completo rompa cualquier página que importe este módulo. No envía nada
// real hasta que se cargue `RESEND_API_KEY` de verdad.
export const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_no_send')

export const FROM = `${process.env.RESEND_FROM_NAME ?? 'Recovery Parts'} <${process.env.RESEND_FROM_EMAIL ?? 'no-reply@recoveryparts.com.ar'}>`
