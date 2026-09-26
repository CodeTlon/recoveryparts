import { render } from '@react-email/render'
import { resend, FROM } from '@/lib/resend'
import { siteUrl } from '@/lib/site-url'
import { CursoAsignado } from '../../emails/CursoAsignado'
import { ContrasenaActualizada } from '../../emails/ContrasenaActualizada'
import { ContactoRecibido } from '../../emails/ContactoRecibido'

// Todas silencian el error de envío (log, no throw): un mail que no sale no
// debe romper el flujo principal (matricular, cambiar contraseña, etc.) — ya
// pasó la parte importante (la DB se actualizó). Bug 33: `render` explícito
// en vez de mandar `react:` directo (react-email/render no viene declarado
// como dependencia transitiva de Resend).

export async function enviarCursoAsignado(to: string, nombre: string, curso: string) {
  try {
    const html = await render(CursoAsignado({ siteUrl: siteUrl(), nombre, curso }))
    await resend.emails.send({ from: FROM, to, subject: `Te sumaron al curso ${curso} — Recovery Parts`, html })
  } catch (err) {
    console.error('[mail] enviarCursoAsignado', err)
  }
}

export async function enviarContrasenaActualizada(to: string) {
  try {
    const html = await render(ContrasenaActualizada({ siteUrl: siteUrl() }))
    await resend.emails.send({ from: FROM, to, subject: 'Tu contraseña fue cambiada — Recovery Parts', html })
  } catch (err) {
    console.error('[mail] enviarContrasenaActualizada', err)
  }
}

export async function enviarContactoRecibido(datos: { nombre: string; email: string; telefono?: string | null; mensaje: string }) {
  const destino = process.env.COMPANY_EMAIL
  if (!destino) return
  try {
    const html = await render(ContactoRecibido({ siteUrl: siteUrl(), ...datos }))
    await resend.emails.send({ from: FROM, to: destino, replyTo: datos.email, subject: `Nueva consulta de ${datos.nombre} — Recovery Parts`, html })
  } catch (err) {
    console.error('[mail] enviarContactoRecibido', err)
  }
}
