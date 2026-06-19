import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ confirmationUrl }: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu email para começar na Jamais Enganada</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>Jamais Enganada</Text>
        </Section>

        <Heading style={h1}>Confirme seu email 💜</Heading>

        <Text style={text}>
          Falta só um passo para você acessar a plataforma{' '}
          <strong>Jamais Enganada</strong>. Clique no botão abaixo para
          confirmar seu email:
        </Text>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Confirmar meu email
          </Button>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Se você não criou esta conta, pode ignorar este email com segurança.
          <br /><br />
          Equipe Jamais Enganada
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
}
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = {
  background: 'linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center' as const,
  marginBottom: '24px',
}
const brand = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 600,
  margin: 0,
  letterSpacing: '-0.5px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#6B0F4B',
  margin: '8px 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#A8006E',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#F3E8EF', margin: '32px 0 20px' }
const footer = {
  fontSize: '12px',
  color: '#9CA3AF',
  lineHeight: '1.6',
  textAlign: 'center' as const,
  margin: 0,
}
