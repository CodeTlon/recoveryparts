import { Text } from '@react-email/components'
import { BaseEmail, btnStyle } from './BaseEmail'

export function ContrasenaActualizada({ siteUrl }: { siteUrl: string }) {
  return (
    <BaseEmail siteUrl={siteUrl} preview="Tu contraseña fue cambiada">
      <Text style={{ fontSize: 20, fontWeight: 700, color: '#08132a', margin: '0 0 16px' }}>Tu contraseña fue cambiada</Text>
      <Text style={{ fontSize: 15, color: '#3f3f46', lineHeight: 1.6 }}>
        Se actualizó la contraseña de tu cuenta de Recovery Parts y cerramos el resto de tus sesiones abiertas por seguridad.
        Si no fuiste vos, escribinos apenas lo veas.
      </Text>
      <a href={`${siteUrl}/login`} style={btnStyle}>Ir al login</a>
    </BaseEmail>
  )
}
