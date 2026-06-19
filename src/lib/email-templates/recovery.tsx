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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefina sua senha da Jamais Enganada</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>Jamais Enganada</Text>
        </Section>

        <Heading style={h1}>Redefinir sua senha</Heading>

        <Text style={text}>
          Recebemos um pedido para redefinir a senha da sua conta. Clique
          no botão abaixo para escolher uma nova senha:
        </Text>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Redefinir minha senha
          </Button>
        </Section>

        <Text style={textSmall}>
          Este link expira em algumas horas, por segurança.
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Se você não pediu para redefinir sua senha, pode ignorar este
          email — sua senha continua a mesma.
          <br /><br />
          Equipe Jamais Enganada 💜
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
const textSmall = {
  fontSize: '13px',
  color: '#6B7280',
  textAlign: 'center' as const,
  margin: '8px 0',
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
