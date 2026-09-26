import { Body, Container, Head, Hr, Html, Img, Preview, Section, Text } from '@react-email/components'

// Fondo blanco a propósito (no navy): un email dark-mode completo se rompe
// fácil en Outlook/Gmail móvil. La identidad de marca queda en la franja
// superior navy + el acento naranja de los botones, el cuerpo es legible en
// cualquier cliente de correo.
const NAVY = '#08132a'
const ORANGE = '#ff6b35'

export function BaseEmail({
  siteUrl,
  preview,
  children,
}: {
  siteUrl: string
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'Montserrat, Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 480, margin: '0 auto', backgroundColor: '#ffffff' }}>
          <Section style={{ backgroundColor: NAVY, padding: '24px 32px' }}>
            <Img src={`${siteUrl}/images/logo.png`} width={40} height={40} alt="Recovery Parts" />
          </Section>
          <Section style={{ padding: '32px' }}>{children}</Section>
          <Hr style={{ borderColor: '#e4e4e7', margin: 0 }} />
          <Section style={{ padding: '20px 32px' }}>
            <Text style={{ fontSize: 12, color: '#71717a', margin: 0 }}>
              Recovery Parts — La Rioja 345, Córdoba, Argentina
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const btnStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: ORANGE,
  color: '#ffffff',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontSize: 13,
  padding: '14px 28px',
  borderRadius: 4,
  textDecoration: 'none',
  marginTop: 16,
}
