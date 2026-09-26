import { Text } from '@react-email/components'
import { BaseEmail, btnStyle } from './BaseEmail'

export function CursoAsignado({
  siteUrl,
  nombre,
  curso,
}: {
  siteUrl: string
  nombre: string
  curso: string
}) {
  return (
    <BaseEmail siteUrl={siteUrl} preview={`Te sumaron al curso ${curso}`}>
      <Text style={{ fontSize: 20, fontWeight: 700, color: '#08132a', margin: '0 0 16px' }}>¡Te sumaron a un nuevo curso!</Text>
      <Text style={{ fontSize: 15, color: '#3f3f46', lineHeight: 1.6 }}>
        Hola {nombre}, te inscribieron en <strong>{curso}</strong>. Ya podés verlo en tu campus con la misma cuenta que ya tenías.
      </Text>
      <a href={`${siteUrl}/login`} style={btnStyle}>Ir al campus</a>
    </BaseEmail>
  )
}
