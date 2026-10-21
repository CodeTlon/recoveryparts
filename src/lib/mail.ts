import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'
import type { Mail } from '@/lib/mail-templates'

// Mail transaccional propio (RF-38, avisos de curso, bandeja de contacto).
// Nunca incluye contraseñas ni tokens. Sin SMTP configurado no hace nada.
export const mailConfigured = Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM)

// Un solo transport con pool (se cachea en globalThis para sobrevivir a las recargas en desarrollo): reutiliza las
// conexiones SMTP en vez de hacer el handshake TLS por cada mail, y limita a 3 las conexiones simultáneas aunque se
// avise a un curso entero con Promise.all (el resto espera en cola; muchos SMTP rechazan ráfagas de conexiones).
const g = globalThis as unknown as { __rpMail?: Transporter }
function transporte() {
  return (g.__rpMail ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    pool: true, maxConnections: 3, maxMessages: 100,
    // Sin tiempos máximos nodemailer espera hasta 10 min y la pantalla queda en «Guardando…».
    connectionTimeout: 8_000, greetingTimeout: 8_000, socketTimeout: 15_000,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  }))
}

// Las plantillas (HTML + texto plano de respaldo) están en `mail-templates.ts`.
export async function enviarMail(to: string | string[], { subject, text, html }: Mail) {
  if (!mailConfigured) return false
  try {
    const t = transporte()
    await t.sendMail({ from: process.env.MAIL_FROM, to, subject, text, html })
    return true
  } catch (e: any) {
    // Causa técnica (código, respuesta del SMTP) para diagnosticar; se tachan los emails: nada de datos personales en logs.
    const causa = [e?.code, e?.responseCode, e?.command, String(e?.response ?? e?.message ?? '').split('\n')[0]].filter(Boolean).join(' ')
    console.error('mail: fallo de envío —', causa.replace(/[^\s@<>"']+@[^\s@<>"']+/g, '[email]').slice(0, 300))
    return false
  }
}
