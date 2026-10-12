import 'server-only'
import { siteUrl } from '@/lib/env'

// Plantillas de los mails transaccionales (RF-38, accesos y avisos de curso). Cada una devuelve asunto, texto plano y HTML.
// Pensadas para clientes de mail: tablas, estilos en línea (con @media para celular y modo oscuro donde el cliente lo soporta).
// Colores de la marca: azul noche (surface), naranja (accent). Logo: /images/logo-mail.png (176px, liviano).
export type Mail = { subject: string; text: string; html: string }

const C = {
  fondo: '#eef1f7', tarjeta: '#ffffff', marca: '#08132a', marcaSuave: '#101b33', acento: '#f97316', acentoOscuro: '#ea580c',
  texto: '#1b2438', suave: '#5b6578', borde: '#e1e6f0', panel: '#f5f7fb',
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// 2026-10-12 → 12/10/2026 (la base entrega fechas ISO).
const fecha = (iso?: string | null) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : '')

type Layout = { etiqueta: string; titulo: string; previa: string; cuerpo: string; boton?: { texto: string; url: string }; pie?: string }

function layout({ etiqueta, titulo, previa, cuerpo, boton, pie }: Layout): string {
  const base = siteUrl()
  return `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>${esc(titulo)}</title>
<style>
  body{margin:0;padding:0;-webkit-text-size-adjust:100%}
  img{border:0;outline:none;text-decoration:none}
  a{color:${C.acentoOscuro}}
  @media only screen and (max-width:600px){
    .px{padding-left:20px!important;padding-right:20px!important}
    .titulo{font-size:22px!important}
    .btn-td{display:block!important;width:100%!important}
    .btn-a{display:block!important;text-align:center!important}
    .marca{font-size:16px!important}
  }
  @media (prefers-color-scheme:dark){
    .fondo{background:#030d25!important}
    .tarjeta{background:#101b33!important;border-color:#2a344d!important}
    .t{color:#e6ecff!important}
    .s{color:#a9b2c8!important}
    .titulo{color:#ffffff!important}
    .panel{background:#151f37!important;border-color:#2a344d!important}
    .pie{background:#0a192f!important;border-color:#2a344d!important}
    .linea{border-color:#2a344d!important}
  }
</style></head>
<body class="fondo" style="margin:0;padding:0;background:${C.fondo};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.texto};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(previa)}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fondo" style="background:${C.fondo};"><tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="tarjeta" style="max-width:580px;background:${C.tarjeta};border:1px solid ${C.borde};border-radius:14px;overflow:hidden;">
    <tr><td class="px" bgcolor="${C.marca}" style="background:${C.marca};padding:22px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:12px;"><img src="${esc(base)}/images/logo-mail.png" width="44" height="44" alt="Recovery Parts" style="display:block;width:44px;height:44px;"></td>
        <td class="marca" style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Recovery Parts</td>
      </tr></table>
    </td></tr>
    <tr><td bgcolor="${C.acento}" height="4" style="background:${C.acento};font-size:0;line-height:0;height:4px;">&nbsp;</td></tr>
    <tr><td class="px" style="padding:34px 32px 30px;">
      <div class="s" style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${C.acentoOscuro};">${esc(etiqueta)}</div>
      <h1 class="titulo" style="margin:0 0 18px;font-size:26px;line-height:1.25;font-weight:800;color:${C.marca};">${esc(titulo)}</h1>
      <div class="t" style="font-size:16px;line-height:1.65;color:${C.texto};">${cuerpo}</div>
      ${boton ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0 6px;"><tr><td class="btn-td" bgcolor="${C.acento}" style="background:${C.acento};border-radius:10px;" align="center">
        <a class="btn-a" href="${esc(boton.url)}" style="display:inline-block;padding:15px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(boton.texto)}</a>
      </td><td></td></tr></table>
      <p class="s" style="margin:14px 0 0;font-size:12px;line-height:1.6;color:${C.suave};">¿No te funciona el botón? Copiá este link en tu navegador:<br><a href="${esc(boton.url)}" style="color:${C.suave};word-break:break-all;">${esc(boton.url)}</a></p>` : ''}
      ${pie ? `<p class="s" style="margin:24px 0 0;padding-top:18px;border-top:1px solid ${C.borde};font-size:13px;line-height:1.6;color:${C.suave};" >${pie}</p>` : ''}
    </td></tr>
    <tr><td class="px pie" style="padding:20px 32px;background:${C.panel};border-top:1px solid ${C.borde};font-size:12px;line-height:1.6;color:${C.suave};">
      <strong style="color:${C.marca};" class="t">Recovery Parts</strong> · Academia de cursos y talleres técnicos · Córdoba, Argentina<br>
      <a href="${esc(base)}" style="color:${C.suave};">${esc(base.replace(/^https?:\/\//, ''))}</a><br>
      Este mail se envió automáticamente: no hace falta responderlo.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`
}

// Bloque destacado para datos (curso, fecha…).
const panel = (html: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;"><tr><td class="panel" style="background:${C.panel};border:1px solid ${C.borde};border-left:4px solid ${C.acento};border-radius:8px;padding:14px 18px;font-size:15px;line-height:1.6;">${html}</td></tr></table>`

export function mailInvitacion(link: string): Mail {
  return {
    subject: 'Activá tu cuenta de Recovery Parts',
    text: `Te invitamos al campus de Recovery Parts.\n\nCreá tu contraseña desde este link (se usa una sola vez y vence en 7 días):\n${link}\n`,
    html: layout({
      etiqueta: 'Campus virtual', titulo: 'Te damos la bienvenida', previa: 'Creá tu contraseña y entrá al campus de Recovery Parts.',
      cuerpo: '<p style="margin:0 0 12px;">Te invitamos a sumarte al campus de Recovery Parts: ahí vas a encontrar tus cursos, el calendario de clases y los materiales.</p><p style="margin:0;">Para empezar, creá tu contraseña.</p>',
      boton: { texto: 'Crear mi contraseña', url: link },
      pie: 'El link se usa una sola vez y vence en 7 días. Si no esperabas esta invitación, ignorá este mail.',
    }),
  }
}

export function mailRecuperacion(link: string): Mail {
  return {
    subject: 'Recuperá tu contraseña',
    text: `Entrá a este link para crear una contraseña nueva (se usa una sola vez y vence en 1 hora):\n${link}\n\nSi no lo pediste vos, ignoralo: tu contraseña actual sigue funcionando.\n`,
    html: layout({
      etiqueta: 'Seguridad de tu cuenta', titulo: 'Creá una contraseña nueva', previa: 'Usá este link para elegir una contraseña nueva. Vence en 1 hora.',
      cuerpo: '<p style="margin:0;">Recibimos un pedido para cambiar la contraseña de tu cuenta del campus de Recovery Parts.</p>',
      boton: { texto: 'Elegir nueva contraseña', url: link },
      pie: 'El link se usa una sola vez y vence en 1 hora. Si no lo pediste vos, ignorá este mail: tu contraseña actual sigue funcionando.',
    }),
  }
}

const ESTADO: Record<string, { fondo: string; color: string }> = {
  suspendida: { fondo: '#fde8e8', color: '#b42318' },
  reprogramada: { fondo: '#fff0e0', color: '#b54708' },
}

export function mailCambiosClases(curso: string, cambios: { clase: string; fecha: string; estado: string }[]): Mail {
  const filas = cambios.map((c) => {
    const e = ESTADO[c.estado] ?? { fondo: '#e8edf7', color: C.marca }
    return `<tr>
    <td class="linea" style="padding:12px 0;border-bottom:1px solid ${C.borde};font-size:15px;"><strong>${esc(c.clase)}</strong><br><span class="s" style="color:${C.suave};font-size:13px;">${esc(fecha(c.fecha))}</span></td>
    <td class="linea" align="right" style="padding:12px 0;border-bottom:1px solid ${C.borde};white-space:nowrap;"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${e.fondo};color:${e.color};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;">${esc(c.estado)}</span></td></tr>`
  }).join('')
  return {
    subject: `Cambios en las clases de ${curso}`,
    text: cambios.map((c) => `${c.clase} (${fecha(c.fecha)}): ${c.estado}`).join('\n') + '\n\nRecovery Parts',
    html: layout({
      etiqueta: 'Aviso de curso', titulo: `Cambios en ${curso}`, previa: 'Hay novedades en el calendario de tu curso.',
      cuerpo: `<p style="margin:0 0 8px;">Hubo cambios en el calendario de tu curso:</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>`,
      boton: { texto: 'Ver mi calendario', url: `${siteUrl()}/login` },
    }),
  }
}

export function mailAgregadoCurso(nombre: string, curso: string, inicio?: string | null): Mail {
  const cuando = fecha(inicio)
  return {
    subject: `Te sumaron al curso ${curso} — Recovery Parts`,
    text: `Hola ${nombre}, fuiste agregado al curso ${curso}${cuando ? ` (inicia el ${cuando})` : ''}. Ingresá al Campus con tu cuenta de siempre.`,
    html: layout({
      etiqueta: 'Nuevo curso', titulo: `Ya sos parte de ${curso}`, previa: `Te sumaron al curso ${curso}.`,
      cuerpo: `<p style="margin:0;">Hola ${esc(nombre)}, te sumamos a un nuevo curso:</p>${panel(`<strong>${esc(curso)}</strong>${cuando ? `<br><span class="s" style="color:${C.suave};">Inicia el ${esc(cuando)}</span>` : ''}`)}<p style="margin:18px 0 0;">Ingresá al campus con tu cuenta de siempre para ver las clases y los materiales.</p>`,
      boton: { texto: 'Ir al campus', url: `${siteUrl()}/login` },
    }),
  }
}
