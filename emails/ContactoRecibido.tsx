import { Text, Hr } from '@react-email/components'
import { BaseEmail } from './BaseEmail'

export function ContactoRecibido({
  siteUrl,
  nombre,
  email,
  telefono,
  mensaje,
}: {
  siteUrl: string
  nombre: string
  email: string
  telefono?: string | null
  mensaje: string
}) {
  return (
    <BaseEmail siteUrl={siteUrl} preview={`Nueva consulta de ${nombre}`}>
      <Text style={{ fontSize: 20, fontWeight: 700, color: '#08132a', margin: '0 0 16px' }}>Nueva consulta del sitio</Text>
      <Text style={{ fontSize: 15, color: '#3f3f46', margin: '4px 0' }}><strong>Nombre:</strong> {nombre}</Text>
      <Text style={{ fontSize: 15, color: '#3f3f46', margin: '4px 0' }}><strong>Email:</strong> {email}</Text>
      {telefono && <Text style={{ fontSize: 15, color: '#3f3f46', margin: '4px 0' }}><strong>Teléfono:</strong> {telefono}</Text>}
      <Hr style={{ borderColor: '#e4e4e7', margin: '16px 0' }} />
      <Text style={{ fontSize: 15, color: '#3f3f46', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{mensaje}</Text>
    </BaseEmail>
  )
}
