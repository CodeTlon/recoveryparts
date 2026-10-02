import 'server-only'
import nodemailer from 'nodemailer'

// Mail transaccional propio (RF-38, avisos de curso, bandeja de contacto).
// Nunca incluye contraseñas ni tokens. Sin SMTP configurado no hace nada.
export const mailConfigured = Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM)

export async function enviarMail(to: string | string[], subject: string, text: string) {
  if (!mailConfigured) return false
  try {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
    await t.sendMail({ from: process.env.MAIL_FROM, to, subject, text })
    return true
  } catch (e) {
    console.error('mail: fallo de envío') // sin datos personales en logs
    return false
  }
}
